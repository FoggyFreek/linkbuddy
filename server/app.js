// The linkpage HTTP app: public page API + view/click beacons, and the
// token-authenticated editor API (main link page + release landing pages).
// Exported as a factory so tests can build it against a test pool without
// binding a port.
import express from 'express'
import crypto from 'node:crypto'
import { signPayload, verifyPayload } from './tokens.js'
import { fetchExport, gigbuddyWebOrigin } from './gigbuddy.js'
import {
  getPageBySlug,
  getPageForTenant,
  getMainPageForTenant,
  listPagesForTenant,
  insertReleasePage,
  deleteReleasePage,
  saveDraftLayout,
  publishDraft,
  saveContentForNamespace,
} from './pagesRepo.js'
import { getTenantNamespace } from './namespacesRepo.js'
import { ensureTenantMainPage, migrateTenantNamespace, NamespaceError } from './namespaceService.js'
import { MAIN_SLUG_RE, RELEASE_TAIL_RE, slugFromSegments, mainSlugOf } from './slugs.js'
import { insertView, insertClick, aggregateStats } from './statsRepo.js'
import { classifyDevice, classifySource, resolveCountry, visitorHash } from './classify.js'
import { validateLayout } from './layout.js'
import { resolvePage } from './resolve.js'
import { sanitizeClickTarget } from './platforms.js'
import { pageEntitlements } from './entitlements.js'
import { fetchLinkMetadata } from './unfurl.js'
import { createConcurrencyGate } from './concurrencyGate.js'

// Bound concurrent editor unfurls: at most a few in flight globally and a
// couple per tenant, so the endpoint's remote fetches can't fan out into
// memory/socket pressure even though each is already byte- and time-capped.
const UNFURL_MAX_GLOBAL = 6
const UNFURL_MAX_PER_TENANT = 2

const SESSION_TTL_SECONDS = 12 * 60 * 60
const INTEGRATION_RATE_LIMIT = 120
const INTEGRATION_RATE_WINDOW_MS = 60 * 1000

// URL/namespace design: a band's main page lives at /<mainSlug> (the band's
// GigBuddy slug); each release page lives one segment deeper at
// /<mainSlug>/<releaseTail>. A main slug can never contain '/', so the stored
// slugs 'foo' (main) and 'foo/bar' (release) occupy separate namespaces and
// can NEVER collide — a release page can no longer shadow, or be mistaken for,
// another band's main page. Both are validated segment-by-segment.
export { MAIN_SLUG_RE, RELEASE_TAIL_RE, slugFromSegments, mainSlugOf }

function contentTtlMs() {
  const minutes = Number(process.env.LINKPAGE_CONTENT_TTL_MINUTES)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 15) * 60 * 1000
}

function statsEnabled() {
  return process.env.STATS_DISABLED !== '1'
}

// Shared beacon dimension derivation — the ONLY place raw request data is
// touched; everything stored is coarse and anonymous (PRIVACY.md).
function beaconDimensions(req) {
  const ua = req.get('user-agent') || ''
  const device = classifyDevice(ua)
  return {
    device,
    source: classifySource(
      typeof req.body?.referrer === 'string' ? req.body.referrer : req.get('referer'),
      typeof req.body?.utmSource === 'string' ? req.body.utmSource : null,
      req.hostname || null,
    ),
    country: resolveCountry((name) => req.get(name)),
    visitorHash: visitorHash(req.ip, ua, process.env.GIGBUDDY_SYNC_SECRET),
  }
}

// Slug from the public path's 1 or 2 segments (main / release).
function publicSlug(req) {
  return slugFromSegments([req.params.s1, req.params.s2])
}

function editorPagePayload(page) {
  return {
    id: page.id,
    slug: page.slug,
    pageType: page.page_type,
    release: page.release,
    draftLayout: page.draft_layout,
    publishedAt: page.published_at,
    contentSyncedAt: page.content_synced_at,
    content: page.content,
    publicUrl: `${(process.env.LINKPAGE_PUBLIC_URL || '').replace(/\/$/, '')}/${page.slug}`,
  }
}

function pageListPayload(pages) {
  return pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    pageType: p.page_type,
    release: p.release,
    publishedAt: p.published_at,
  }))
}

function validIntegrationBearer(header) {
  const prefix = 'Bearer '
  const supplied = typeof header === 'string' && header.startsWith(prefix) ? header.slice(prefix.length) : ''
  const expected = process.env.GIGBUDDY_SYNC_SECRET || ''
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest()
  const expectedHash = crypto.createHash('sha256').update(expected).digest()
  return Boolean(expected) && crypto.timingSafeEqual(suppliedHash, expectedHash)
}

function createIntegrationRateLimiter() {
  const clients = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip || 'unknown'
    let entry = clients.get(key)
    if (!entry || now - entry.startedAt >= INTEGRATION_RATE_WINDOW_MS) {
      entry = { startedAt: now, count: 0 }
      clients.set(key, entry)
    }
    entry.count += 1
    if (entry.count > INTEGRATION_RATE_LIMIT) {
      const retrySeconds = Math.max(1, Math.ceil((entry.startedAt + INTEGRATION_RATE_WINDOW_MS - now) / 1000))
      res.set('Retry-After', String(retrySeconds))
      return res.status(429).json({ code: 'rate_limited', error: 'Too many synchronization requests' })
    }
    next()
  }
}

function namespaceErrorResponse(error) {
  if (!(error instanceof NamespaceError)) return null
  if (error.code === 'invalid_request') return { status: 400, code: error.code }
  if (['slug_conflict', 'revision_gap', 'revision_conflict', 'invalid_namespace'].includes(error.code)) {
    return { status: 409, code: error.code }
  }
  if (error.code === 'namespace_sync_required') return { status: 409, code: error.code }
  return null
}

export function createApp(pool, overrides = {}) {
  const migrateNamespace = overrides.migrateTenantNamespace || migrateTenantNamespace
  const ensureMainPage = overrides.ensureTenantMainPage || ensureTenantMainPage
  const app = express()
  app.set('trust proxy', true)
  app.use(express.json({ limit: '256kb' }))

  // Liveness probe for the container/reverse proxy. Deliberately trivial (no
  // DB round-trip) so it stays up while the DB reconnects.
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  // Content exports are fetched per band (by the band's main slug) and stored
  // per page, so release pages resolve against the same fresh snapshot.
  async function syncContent(page, mainSlug, slugRevision) {
    const result = await fetchExport(mainSlug)
    if (result.notFound) return page
    return saveContentForNamespace(
      pool,
      page.id,
      page.gigbuddy_tenant_id,
      mainSlug,
      slugRevision,
      result.content,
    )
  }

  function maybeRefreshContent(page) {
    const syncedAt = page.content_synced_at ? new Date(page.content_synced_at).getTime() : 0
    if (Date.now() - syncedAt < contentTtlMs()) return
    syncContent(page, mainSlugOf(page)).catch((err) => {
      console.error(`content refresh failed for ${page.slug}:`, err.message)
    })
  }

  const integrationRateLimit = createIntegrationRateLimiter()
  const requireIntegrationSecret = (req, res, next) => {
    if (!validIntegrationBearer(req.get('authorization'))) {
      return res.status(401).json({ code: 'unauthorized', error: 'Unauthorized' })
    }
    next()
  }

  app.put(
    '/api/integrations/gigbuddy/tenants/:tenantId/slug',
    requireIntegrationSecret,
    integrationRateLimit,
    async (req, res, next) => {
      const startedAt = Date.now()
      const tenantText = req.params.tenantId
      const tenantId = /^[1-9]\d*$/.test(tenantText) ? Number(tenantText) : NaN
      const { oldSlug, newSlug, revision } = req.body || {}
      let resultCode = 'internal_error'
      try {
        if (
          !Number.isSafeInteger(tenantId) ||
          typeof oldSlug !== 'string' ||
          !MAIN_SLUG_RE.test(oldSlug) ||
          typeof newSlug !== 'string' ||
          !MAIN_SLUG_RE.test(newSlug) ||
          oldSlug === newSlug ||
          !Number.isSafeInteger(revision) ||
          revision <= 0
        ) {
          resultCode = 'invalid_request'
          return res.status(400).json({ code: resultCode, error: 'Invalid slug synchronization command' })
        }

        const result = await migrateNamespace(pool, { tenantId, newSlug, revision })
        resultCode = result.code
        if (result.code === 'applied') {
          const main = await getMainPageForTenant(pool, tenantId)
          if (main) {
            try {
              await syncContent(main, newSlug, revision)
            } catch (error) {
              console.error(`content refresh failed after namespace migration for tenant ${tenantId}:`, error.message)
            }
          }
        }
        return res.json({ code: result.code })
      } catch (error) {
        const response = namespaceErrorResponse(error)
        if (!response) return next(error)
        resultCode = response.code
        return res.status(response.status).json({ code: response.code, error: error.message })
      } finally {
        console.info('gigbuddy slug sync', {
          tenantId: Number.isSafeInteger(tenantId) ? tenantId : null,
          revision: Number.isSafeInteger(revision) ? revision : null,
          result: resultCode,
          durationMs: Date.now() - startedAt,
        })
      }
    },
  )

  async function publishedPageForBeacon(req) {
    if (!statsEnabled()) return null
    const slug = publicSlug(req)
    if (!slug) return null
    const page = await getPageBySlug(pool, slug)
    if (!page?.published_layout) return null
    if (!pageEntitlements(page.content).enabled) return null
    return page
  }

  // ---------- public ----------
  //
  // Public routes accept one path segment (main page, /<slug>) or two (release
  // page, /<mainSlug>/<tail>); each action is registered for both arities.

  // Resolved published page. No cookies are set anywhere on the public
  // surface — the privacy stance depends on it.
  async function handleGetPage(req, res, next) {
    try {
      const slug = publicSlug(req)
      if (!slug) return res.status(404).json({ error: 'Not found' })
      const page = await getPageBySlug(pool, slug)
      if (!page?.published_layout) return res.status(404).json({ error: 'Not found' })
      maybeRefreshContent(page)
      // A lapsed plan (content sync reported the linkpage feature off) takes
      // the page offline — same 404 as an unpublished page.
      if (!pageEntitlements(page.content).enabled) return res.status(404).json({ error: 'Not found' })
      res.set('Cache-Control', 'public, max-age=60')
      // gigbuddyUrl rides along with the payload (rather than being baked into
      // the bundle) so the attribution badge follows the deployment's config.
      res.json({ ...resolvePage(page.content, page.published_layout, page.release), gigbuddyUrl: gigbuddyWebOrigin() || null })
    } catch (err) {
      next(err)
    }
  }
  app.get('/api/pages/:s1', handleGetPage)
  app.get('/api/pages/:s1/:s2', handleGetPage)

  // View beacon, fired once per public page load.
  async function handleView(req, res, next) {
    try {
      const page = await publishedPageForBeacon(req)
      if (page) {
        const dims = beaconDimensions(req)
        if (dims.device !== 'bot') await insertView(pool, page.id, dims)
      }
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
  app.post('/api/pages/:s1/view', handleView)
  app.post('/api/pages/:s1/:s2/view', handleView)

  // Outbound click beacon (conversion statistics): which platform button or
  // widget was clicked, in the same anonymous dimensions as views.
  async function handleClick(req, res, next) {
    try {
      const page = await publishedPageForBeacon(req)
      const target = sanitizeClickTarget(req.body?.target)
      if (page && target) {
        const dims = beaconDimensions(req)
        if (dims.device !== 'bot') await insertClick(pool, page.id, { target, ...dims })
      }
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
  app.post('/api/pages/:s1/click', handleClick)
  app.post('/api/pages/:s1/:s2/click', handleClick)

  // ---------- editor ----------

  // Exchange a gigbuddy handoff token for an editor session bound to the
  // band (tenant), covering the main page and all its release pages.
  app.post('/api/editor/session', async (req, res, next) => {
    try {
      const handoff = verifyPayload(req.body?.token)
      if (
        handoff?.t !== 'handoff' ||
        typeof handoff.slug !== 'string' ||
        !MAIN_SLUG_RE.test(handoff.slug) ||
        !Number.isSafeInteger(handoff.tenantId) ||
        handoff.tenantId <= 0 ||
        (handoff.slugRevision !== undefined &&
          (!Number.isSafeInteger(handoff.slugRevision) || handoff.slugRevision < 0))
      ) {
        return res.status(401).json({ error: 'Invalid or expired editor link — reopen it from GigBuddy' })
      }
      let reconciled
      try {
        reconciled = await ensureMainPage(pool, handoff)
      } catch (error) {
        const response = namespaceErrorResponse(error)
        if (!response) throw error
        const reopen = ['namespace_sync_required', 'revision_gap', 'revision_conflict'].includes(error.code)
        return res.status(response.status).json({
          error: reopen
            ? 'Link-page address is still synchronizing - reopen the editor from GigBuddy'
            : 'This link-page address is already in use - contact support to resolve it',
          code: error.code,
        })
      }
      let page = reconciled.page
      // null → the slug is already held by another tenant or a release page
      // (the global slug namespace is shared). Refuse rather than open a
      // session onto a foreign/corrupted row.
      if (!page) {
        return res.status(409).json({
          error: 'This link-page address is already in use — contact support to resolve it',
          code: 'slug_conflict',
        })
      }
      try {
        page = await syncContent(page, reconciled.mainSlug, reconciled.slugRevision)
        if (!page) {
          return res.status(409).json({
            code: 'namespace_sync_required',
            error: 'Link-page address changed again - reopen the editor from GigBuddy',
          })
        }
      } catch (err) {
        console.error(`content sync failed for ${page.slug}:`, err.message)
        return res.status(502).json({ error: 'Could not load content from GigBuddy — try again' })
      }
      const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
      const session = signPayload({
        t: 'session',
        tenantId: handoff.tenantId,
        mainSlug: reconciled.mainSlug,
        slugRevision: reconciled.slugRevision,
        exp,
        n: crypto.randomUUID(),
      })
      const pages = await listPagesForTenant(pool, handoff.tenantId)
      res.json({ session, pages: pageListPayload(pages), page: editorPagePayload(page) })
    } catch (err) {
      next(err)
    }
  })

  const requireSession = (req, res, next) => {
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    const session = verifyPayload(token)
    if (session?.t !== 'session' || !Number.isInteger(session.tenantId)) {
      return res.status(401).json({ error: 'Session expired — reopen the editor from GigBuddy' })
    }
    req.editorSession = session
    next()
  }

  const requireCurrentNamespace = async (req, res, next) => {
    try {
      const namespace = await getTenantNamespace(pool, req.editorSession.tenantId)
      const sessionRevision = req.editorSession.slugRevision
      const revisionMismatch = Number.isSafeInteger(sessionRevision) &&
        sessionRevision !== Number(namespace?.slug_revision)
      if (!namespace || namespace.main_slug !== req.editorSession.mainSlug || revisionMismatch) {
        return res.status(401).json({ error: 'Session expired - reopen the editor from GigBuddy' })
      }
      next()
    } catch (error) {
      next(error)
    }
  }

  // Loads req.page for :pageId, scoped to the session's tenant: a foreign
  // page id 404s, existence must not leak.
  const loadPage = async (req, res, next) => {
    try {
      const pageId = Number(req.params.pageId)
      if (!Number.isInteger(pageId) || pageId <= 0) return res.status(404).json({ error: 'Not found' })
      const page = await getPageForTenant(pool, pageId, req.editorSession.tenantId)
      if (!page) return res.status(404).json({ error: 'Not found' })
      req.page = page
      next()
    } catch (err) {
      next(err)
    }
  }

  // Link enrichment for the editor: oEmbed / Open Graph metadata (title,
  // artwork, description) plus the embed descriptor for a pasted URL. Rate-
  // limited by in-flight concurrency (global + per tenant) → 429 when saturated.
  const unfurlGate = createConcurrencyGate({ max: UNFURL_MAX_GLOBAL, maxPerKey: UNFURL_MAX_PER_TENANT })
  app.post('/api/editor/unfurl', requireSession, async (req, res) => {
    const key = req.editorSession.tenantId
    if (!unfurlGate.tryAcquire(key)) {
      return res.status(429).json({ error: 'Too many link lookups at once — try again in a moment' })
    }
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
    try {
      res.json(await fetchLinkMetadata(url))
    } catch {
      res.status(422).json({ error: 'Could not read that link — check the URL' })
    } finally {
      unfurlGate.release(key)
    }
  })

  app.get('/api/editor/pages', requireSession, async (req, res, next) => {
    try {
      const pages = await listPagesForTenant(pool, req.editorSession.tenantId)
      res.json({ pages: pageListPayload(pages) })
    } catch (err) {
      next(err)
    }
  })

  // Create a release landing page for a song at /<mainSlug>/<tail>: the slug is
  // namespaced under the band's main slug (so it can never collide with any
  // band's main page), the layout starts with a platforms widget, and the
  // content snapshot is inherited so the page previews instantly.
  app.post('/api/editor/pages', requireSession, requireCurrentNamespace, async (req, res, next) => {
    try {
      const { tenantId, mainSlug } = req.editorSession
      const main = await getPageBySlug(pool, mainSlug)
      if (!main || main.gigbuddy_tenant_id !== tenantId) {
        return res.status(401).json({ error: 'Session expired — reopen the editor from GigBuddy' })
      }
      const songId = Number(req.body?.songId)
      const song = (main.content?.songs || []).find((s) => s.id === songId)
      if (!song) return res.status(400).json({ error: 'Pick a song from the list' })
      if (!(song.links || []).length) {
        return res.status(400).json({ error: `“${song.title}” has no streaming links — add them in GigBuddy first` })
      }

      // Plan cap on smart link pages (silver 3, gold 30; the main page is free).
      const { maxReleasePages } = pageEntitlements(main.content)
      if (maxReleasePages !== null) {
        const existing = await listPagesForTenant(pool, tenantId)
        const releaseCount = existing.filter((p) => p.page_type === 'release').length
        if (releaseCount >= maxReleasePages) {
          return res.status(403).json({
            error: `Your plan allows up to ${maxReleasePages} release pages — delete one or upgrade in GigBuddy`,
            code: 'limit_reached',
          })
        }
      }

      // The release path is '<mainSlug>/<tail>'. Accept either the full path or
      // a bare tail from the client; the stored slug is always the full path.
      const raw = String(req.body?.slug || '').toLowerCase()
      const prefix = `${mainSlug}/`
      const tail = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw
      if (!RELEASE_TAIL_RE.test(tail)) {
        return res.status(400).json({ error: `Address must be "${mainSlug}/<name>"` })
      }
      const slug = `${mainSlug}/${tail}`

      const release = { songId: song.id, title: song.title, artist: song.artist }
      const layout = {
        sections: [
          {
            id: crypto.randomUUID(),
            title: null,
            widgets: [{ id: crypto.randomUUID(), type: 'platforms', songId: song.id, title: null }],
          },
        ],
      }
      const page = await insertReleasePage(
        pool,
        slug,
        tenantId,
        release,
        layout,
        main.content,
        mainSlug,
        req.editorSession.slugRevision,
      )
      if (!page) {
        const namespace = await getTenantNamespace(pool, tenantId)
        if (
          !namespace ||
          namespace.main_slug !== mainSlug ||
          (Number.isSafeInteger(req.editorSession.slugRevision) &&
            Number(namespace.slug_revision) !== req.editorSession.slugRevision)
        ) {
          return res.status(401).json({ error: 'Session expired - reopen the editor from GigBuddy' })
        }
        return res.status(409).json({ error: 'That slug is already taken' })
      }
      res.status(201).json({ page: editorPagePayload(page) })
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/editor/pages/:pageId', requireSession, loadPage, (req, res) => {
    res.json(editorPagePayload(req.page))
  })

  app.delete('/api/editor/pages/:pageId', requireSession, loadPage, async (req, res, next) => {
    try {
      const deleted = await deleteReleasePage(pool, req.page.id, req.editorSession.tenantId)
      if (!deleted) return res.status(400).json({ error: 'The main page cannot be deleted' })
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/editor/pages/:pageId/draft', requireSession, loadPage, async (req, res, next) => {
    try {
      const result = validateLayout(req.body?.layout)
      if (result.error) return res.status(400).json({ error: result.error })
      await saveDraftLayout(pool, req.page.id, result.layout)
      res.json({ draftLayout: result.layout })
    } catch (err) {
      next(err)
    }
  })

  // Preview-as-visitor: the draft resolved exactly like the public endpoint
  // resolves the published layout.
  app.get('/api/editor/pages/:pageId/preview', requireSession, loadPage, (req, res) => {
    res.json(resolvePage(req.page.content, req.page.draft_layout, req.page.release))
  })

  app.post('/api/editor/pages/:pageId/publish', requireSession, loadPage, async (req, res, next) => {
    try {
      const page = await publishDraft(pool, req.page.id)
      res.json({ publishedAt: page.published_at })
    } catch (err) {
      next(err)
    }
  })

  app.post(
    '/api/editor/pages/:pageId/refresh-content',
    requireSession,
    requireCurrentNamespace,
    loadPage,
    async (req, res, next) => {
      try {
        const page = await syncContent(
          req.page,
          req.editorSession.mainSlug,
          req.editorSession.slugRevision,
        )
        if (!page) {
          return res.status(401).json({ error: 'Session expired - reopen the editor from GigBuddy' })
        }
        res.json(editorPagePayload(page))
      } catch (err) {
        next(err)
      }
    },
  )

  app.get('/api/editor/pages/:pageId/stats', requireSession, loadPage, async (req, res, next) => {
    try {
      // The plan's rolling window (30 or 90 days) caps how far back stats go.
      const retentionDays = pageEntitlements(req.page.content).statsRetentionDays
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), retentionDays)
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const stats = await aggregateStats(pool, req.page.id, since)
      res.json({ days, retentionDays, enabled: statsEnabled(), ...stats })
    } catch (err) {
      next(err)
    }
  })

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ code: 'invalid_request', error: 'Malformed JSON body' })
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ code: 'request_too_large', error: 'Request body is too large' })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal error' })
  })

  return app
}
