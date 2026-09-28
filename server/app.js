// The linkpage HTTP app: public page API + view/click beacons, and the
// token-authenticated editor API (main link page + release landing pages).
// Exported as a factory so tests can build it against a test pool without
// binding a port.
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { linkbuddyKey, signSession, verifyHandoff, verifySession } from './features/editor/tokens.js'
import { consumeHandoffNonce } from './features/editor/handoffsRepo.js'
import { fetchEditorAccess, fetchExport, gigbuddyWebOrigin } from './features/integrations/gigbuddy.js'
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
} from './features/pages/pagesRepo.js'
import { getTenantNamespace } from './features/pages/namespacesRepo.js'
import { ensureTenantMainPage, migrateTenantNamespace, NamespaceError } from './features/pages/namespaceService.js'
import { MAIN_SLUG_RE, RELEASE_TAIL_RE, slugFromSegments, mainSlugOf } from './features/pages/slugs.js'
import { insertView, insertClick, aggregateStats, summaryStats } from './features/statistics/statsRepo.js'
import { classifyDevice, classifySource, resolveCountry, visitorHash } from './features/statistics/classify.js'
import { validateLayout } from './features/editor/layout.js'
import { resolvePage } from './features/public-pages/resolve.js'
import { pageMetaFor, injectMetaTags } from './features/public-pages/metaTags.js'
import { sanitizeClickTarget } from './features/public-pages/platforms.js'
import { pageEntitlements, DEFAULT_STATS_RETENTION_DAYS } from './features/editor/entitlements.js'
import { fetchLinkMetadata } from './features/unfurl/unfurl.js'
import { createConcurrencyGate } from './features/unfurl/concurrencyGate.js'
import { createRateLimiter } from './rateLimiter.js'
import { securityHeaders } from './securityHeaders.js'

// Bound concurrent editor unfurls: at most a few in flight globally and a
// couple per tenant, so the endpoint's remote fetches can't fan out into
// memory/socket pressure even though each is already byte- and time-capped.
const UNFURL_MAX_GLOBAL = 6
const UNFURL_MAX_PER_TENANT = 2

const REFRESH_RETRY_MS = 60 * 1000
const SESSION_TTL_SECONDS = 12 * 60 * 60
// How long GigBuddy's answer on a member's editor access is trusted.
const ACCESS_RECHECK_MS = 5 * 60 * 1000
const HANDOFF_NONCE_RE = /^[\w-]{16,64}$/
// Every GigBuddy call arrives from one host, so these budgets are shared by all
// of its tenants. The read routes get their own, far larger bucket: a dashboard
// view costs two reads, and a busy hour of those must never exhaust the budget
// the slug-sync outbox depends on to converge.
const INTEGRATION_RATE_LIMIT = 120
const INTEGRATION_READ_RATE_LIMIT = 1200
const INTEGRATION_RATE_WINDOW_MS = 60 * 1000
// Per visitor address: generous for real page views and clicks, tight enough
// that one client cannot inflate statistics or grow the event tables at will.
const BEACON_RATE_LIMIT = 60
const BEACON_RATE_WINDOW_MS = 60 * 1000

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
    country: resolveCountry((name) => req.get(name), process.env.STATS_COUNTRY_HEADER),
    visitorHash: visitorHash(req.ip, ua, linkbuddyKey('visitor-hash').toString('base64')),
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
  const expected = process.env.GIGBUDDY_INTEGRATION_TOKEN || ''
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest()
  const expectedHash = crypto.createHash('sha256').update(expected).digest()
  return Boolean(expected) && crypto.timingSafeEqual(suppliedHash, expectedHash)
}

function createIntegrationRateLimiter(limit = INTEGRATION_RATE_LIMIT) {
  return createRateLimiter({
    limit,
    windowMs: INTEGRATION_RATE_WINDOW_MS,
    body: { code: 'rate_limited', error: 'Too many synchronization requests' },
  })
}

// Proxy hops in front of this app (nginx by default). Express then takes the
// visitor address from the entry that proxy appended, never a client-sent one.
function trustedProxyHops() {
  const hops = Number(process.env.TRUST_PROXY_HOPS)
  return Number.isSafeInteger(hops) && hops >= 0 ? hops : 1
}

// Tenant and page ids arrive as text on the GigBuddy integration routes; only
// a positive integer is ever a real one.
function parseId(text) {
  return /^[1-9]\d*$/.test(text) ? Number(text) : NaN
}

// The requested statistics window, clamped into [1, the page's plan window].
// A missing, non-numeric or fractional `days` falls back to the 30-day default.
function statsWindow(rawDays, retentionDays) {
  const days = Math.min(Math.max(Math.floor(Number(rawDays)) || DEFAULT_STATS_RETENTION_DAYS, 1), retentionDays)
  return { days, since: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
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
  const shellPath = overrides.distDir ? path.join(overrides.distDir, 'index.html') : null
  const hasShell = Boolean(shellPath && fs.existsSync(shellPath))
  app.set('trust proxy', trustedProxyHops())
  app.use(securityHeaders({ shellHtml: hasShell ? fs.readFileSync(shellPath, 'utf8') : '' }))
  // Session- and bearer-authenticated responses must never land in a shared (CDN) cache.
  app.use(['/api/editor', '/api/integrations'], (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store')
    next()
  })
  app.use(express.json({ limit: '256kb' }))

  // Liveness probe for the container/reverse proxy. Deliberately trivial (no
  // DB round-trip) so it stays up while the DB reconnects.
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  // Content exports are fetched per band (by the band's main slug) and stored
  // per page, so release pages resolve against the same fresh snapshot.
  // Concurrent syncs of one page share a single export pull.
  const syncsInFlight = new Map()
  function syncContent(page, mainSlug, slugRevision) {
    const key = `${page.id}:${mainSlug}:${slugRevision ?? ''}`
    if (syncsInFlight.has(key)) return syncsInFlight.get(key)
    const sync = (async () => {
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
    })().finally(() => syncsInFlight.delete(key))
    syncsInFlight.set(key, sync)
    return sync
  }

  // Public views only ever trigger one attempt per page per retry window, so
  // a failing or rate-limited GigBuddy is not hammered by visitor traffic.
  const refreshAttempts = new Map()
  function maybeRefreshContent(page) {
    const now = Date.now()
    const syncedAt = page.content_synced_at ? new Date(page.content_synced_at).getTime() : 0
    if (now - syncedAt < contentTtlMs()) return
    if (now - (refreshAttempts.get(page.id) ?? 0) < REFRESH_RETRY_MS) return
    refreshAttempts.set(page.id, now)
    syncContent(page, mainSlugOf(page))
      .then(() => refreshAttempts.delete(page.id))
      .catch((err) => {
        console.error(`content refresh failed for ${page.slug}:`, err.message)
      })
  }

  const integrationRateLimit = createIntegrationRateLimiter()
  // Separate bucket, so read traffic and slug sync cannot starve each other.
  const integrationReadRateLimit = createIntegrationRateLimiter(INTEGRATION_READ_RATE_LIMIT)
  const requireIntegrationSecret = (req, res, next) => {
    if (!validIntegrationBearer(req.get('authorization'))) {
      return res.status(401).json({ code: 'unauthorized', error: 'Unauthorized' })
    }
    next()
  }

  app.put(
    '/api/integrations/gigbuddy/tenants/:tenantId/slug',
    integrationRateLimit,
    requireIntegrationSecret,
    async (req, res, next) => {
      const startedAt = Date.now()
      const tenantId = parseId(req.params.tenantId)
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

  // The tenant's pages, so GigBuddy can offer a picker when a band has more
  // than one. Identity and publication state only — no layout, no content
  // snapshot; those stay behind the editor session.
  app.get(
    '/api/integrations/gigbuddy/tenants/:tenantId/pages',
    integrationReadRateLimit,
    requireIntegrationSecret,
    async (req, res, next) => {
      const tenantId = parseId(req.params.tenantId)
      if (!Number.isSafeInteger(tenantId)) {
        return res.status(400).json({ code: 'invalid_request', error: 'Invalid tenant id' })
      }
      try {
        res.json({ pages: pageListPayload(await listPagesForTenant(pool, tenantId)) })
      } catch (err) {
        next(err)
      }
    },
  )

  // Aggregate statistics for one of a tenant's link pages — the main page
  // unless `pageId` names another. Same shared secret as the slug sync, and
  // summary-only: the per-dimension breakdowns (device, country, source) stay
  // inside the editor, so nothing beyond totals and the daily series ever
  // leaves this app.
  app.get(
    '/api/integrations/gigbuddy/tenants/:tenantId/stats',
    integrationReadRateLimit,
    requireIntegrationSecret,
    async (req, res, next) => {
      const tenantId = parseId(req.params.tenantId)
      const requestedPage = req.query.pageId === undefined ? null : parseId(String(req.query.pageId))
      if (!Number.isSafeInteger(tenantId) || (requestedPage !== null && !Number.isSafeInteger(requestedPage))) {
        return res.status(400).json({ code: 'invalid_request', error: 'Invalid tenant or page id' })
      }
      try {
        // Page ids are global but pages are not: the lookup is tenant-scoped,
        // so another tenant's page is simply not found.
        const page = requestedPage === null
          ? await getMainPageForTenant(pool, tenantId)
          : await getPageForTenant(pool, requestedPage, tenantId)
        if (!page && requestedPage !== null) {
          return res.status(404).json({ code: 'page_not_found', error: 'Page not found' })
        }
        // Not an error: a band can be on a plan that includes link pages long
        // before it opens the editor for the first time.
        if (!page) return res.json({ hasPage: false })

        const retentionDays = pageEntitlements(page.content).statsRetentionDays
        const { days, since } = statsWindow(req.query.days, retentionDays)
        const stats = await summaryStats(pool, page.id, since)
        res.json({
          hasPage: true,
          pageId: page.id,
          slug: page.slug,
          days,
          retentionDays,
          enabled: statsEnabled(),
          ...stats,
        })
      } catch (err) {
        next(err)
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
  const beaconRateLimit = createRateLimiter({ limit: BEACON_RATE_LIMIT, windowMs: BEACON_RATE_WINDOW_MS })
  app.post('/api/pages/:s1/view', beaconRateLimit, handleView)
  app.post('/api/pages/:s1/:s2/view', beaconRateLimit, handleView)

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
  app.post('/api/pages/:s1/click', beaconRateLimit, handleClick)
  app.post('/api/pages/:s1/:s2/click', beaconRateLimit, handleClick)

  // ---------- editor ----------

  // GigBuddy stays the authority on who may edit: a member's access is
  // re-confirmed at most every ACCESS_RECHECK_MS, so revoking it there ends the
  // session here. A failed check is forgotten, so the next request asks again.
  const accessChecks = new Map()
  function forgetExpiredAccess(now) {
    for (const [key, entry] of accessChecks) {
      if (now - entry.checkedAt >= ACCESS_RECHECK_MS) accessChecks.delete(key)
    }
  }
  function confirmEditorAccess(tenantId, userId) {
    const now = Date.now()
    const key = `${tenantId}:${userId}`
    const cached = accessChecks.get(key)
    if (cached && now - cached.checkedAt < ACCESS_RECHECK_MS) return cached.allowed
    if (accessChecks.size > 1000) forgetExpiredAccess(now)
    const allowed = fetchEditorAccess(tenantId, userId)
    accessChecks.set(key, { allowed, checkedAt: now })
    allowed.catch(() => accessChecks.delete(key))
    return allowed
  }
  function rememberEditorAccess(tenantId, userId) {
    accessChecks.set(`${tenantId}:${userId}`, { allowed: Promise.resolve(true), checkedAt: Date.now() })
  }

  // Exchange a gigbuddy handoff token for an editor session bound to the
  // band (tenant), covering the main page and all its release pages.
  app.post('/api/editor/session', async (req, res, next) => {
    try {
      const handoff = verifyHandoff(req.body?.token)
      if (
        handoff?.t !== 'handoff' ||
        typeof handoff.n !== 'string' ||
        !HANDOFF_NONCE_RE.test(handoff.n) ||
        typeof handoff.slug !== 'string' ||
        !MAIN_SLUG_RE.test(handoff.slug) ||
        !Number.isSafeInteger(handoff.tenantId) ||
        handoff.tenantId <= 0 ||
        !Number.isSafeInteger(handoff.userId) ||
        handoff.userId <= 0 ||
        (handoff.slugRevision !== undefined &&
          (!Number.isSafeInteger(handoff.slugRevision) || handoff.slugRevision < 0))
      ) {
        return res.status(401).json({ error: 'Invalid or expired editor link — reopen it from GigBuddy' })
      }
      if (!(await consumeHandoffNonce(pool, handoff.n, handoff.exp))) {
        return res.status(401).json({ error: 'This editor link was already used — reopen it from GigBuddy' })
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
        return res.status(502).json({ error: 'Could not load content from GigBuddy — reopen the editor from GigBuddy' })
      }
      const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
      const session = signSession({
        t: 'session',
        tenantId: handoff.tenantId,
        userId: handoff.userId,
        mainSlug: reconciled.mainSlug,
        slugRevision: reconciled.slugRevision,
        exp,
        n: crypto.randomUUID(),
      })
      rememberEditorAccess(handoff.tenantId, handoff.userId)
      const pages = await listPagesForTenant(pool, handoff.tenantId)
      res.json({ session, pages: pageListPayload(pages), page: editorPagePayload(page) })
    } catch (err) {
      next(err)
    }
  })

  const requireSession = (req, res, next) => {
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    const session = verifySession(token)
    if (
      session?.t !== 'session' ||
      !Number.isSafeInteger(session.tenantId) ||
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0
    ) {
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

  const requireEditorAccess = async (req, res, next) => {
    const { tenantId, userId } = req.editorSession
    let allowed
    try {
      allowed = await confirmEditorAccess(tenantId, userId)
    } catch (error) {
      console.error(`editor access check failed for tenant ${tenantId}:`, error.message)
      return res.status(503).json({ error: 'Could not confirm your access with GigBuddy — try again' })
    }
    if (!allowed) {
      return res.status(401).json({ error: 'Your access to this link page has ended — reopen the editor from GigBuddy' })
    }
    next()
  }

  // Every editor route: a valid session, a member GigBuddy still confirms, and
  // the tenant's current namespace.
  const requireEditor = [requireSession, requireEditorAccess, requireCurrentNamespace]

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
  app.post('/api/editor/unfurl', requireEditor, async (req, res) => {
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

  app.get('/api/editor/pages', requireEditor, async (req, res, next) => {
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
  app.post('/api/editor/pages', requireEditor, async (req, res, next) => {
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

  app.get('/api/editor/pages/:pageId', requireEditor, loadPage, (req, res) => {
    res.json(editorPagePayload(req.page))
  })

  app.delete('/api/editor/pages/:pageId', requireEditor, loadPage, async (req, res, next) => {
    try {
      const deleted = await deleteReleasePage(pool, req.page.id, req.editorSession.tenantId)
      if (!deleted) return res.status(400).json({ error: 'The main page cannot be deleted' })
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/editor/pages/:pageId/draft', requireEditor, loadPage, async (req, res, next) => {
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
  app.get('/api/editor/pages/:pageId/preview', requireEditor, loadPage, (req, res) => {
    res.json(resolvePage(req.page.content, req.page.draft_layout, req.page.release))
  })

  app.post('/api/editor/pages/:pageId/publish', requireEditor, loadPage, async (req, res, next) => {
    try {
      const page = await publishDraft(pool, req.page.id)
      res.json({ publishedAt: page.published_at })
    } catch (err) {
      next(err)
    }
  })

  app.post(
    '/api/editor/pages/:pageId/refresh-content',
    requireEditor,
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

  app.get('/api/editor/pages/:pageId/stats', requireEditor, loadPage, async (req, res, next) => {
    try {
      // The plan's rolling window (30 or 90 days) caps how far back stats go.
      const retentionDays = pageEntitlements(req.page.content).statsRetentionDays
      const { days, since } = statsWindow(req.query.days, retentionDays)
      const stats = await aggregateStats(pool, req.page.id, since)
      res.json({ days, retentionDays, enabled: statsEnabled(), ...stats })
    } catch (err) {
      next(err)
    }
  })

  // ---------- built client + share cards ----------
  //
  // Mounted last, so it can never shadow an API route. A public page's HTML
  // gets its Open Graph tags injected here rather than client-side: WhatsApp,
  // X, iMessage, Discord and Signal fetch the document and never run the
  // bundle, so the card a shared link previews with can only come from the
  // server.
  if (hasShell) {
    // Build output is content-hashed, so a CDN may keep it for good. A bundle
    // from another build must 404: the HTML shell under a .js URL breaks the
    // page and would be cached as if it were the script.
    app.use('/assets', express.static(path.join(overrides.distDir, 'assets'), { maxAge: '1y', immutable: true }))
    app.use('/assets', (_req, res) => {
      res.set('Cache-Control', 'no-store').status(404).type('text').send('Not found')
    })
    app.use(express.static(overrides.distDir, { index: false }))

    async function shareCardMeta(pathname) {
      const slug = slugFromSegments(pathname.split('/').filter(Boolean))
      if (!slug) return null
      const page = await getPageBySlug(pool, slug)
      // Unpublished or plan-lapsed pages 404 on the API; their shell stays
      // anonymous here for the same reason.
      if (!page?.published_layout || !pageEntitlements(page.content).enabled) return null
      const base = (process.env.LINKPAGE_PUBLIC_URL || '').replace(/\/$/, '')
      const resolved = resolvePage(page.content, page.published_layout, page.release)
      return pageMetaFor(resolved, { pageUrl: base ? `${base}/${slug}` : null })
    }

    // SPA fallback for /, /:slug, /edit and /privacy.
    app.get(['/', '/*splat'], async (req, res, next) => {
      try {
        const shell = await fs.promises.readFile(shellPath, 'utf8')
        const meta = await shareCardMeta(req.path)
        // Any other shell names the current build's bundle, so it must be
        // revalidated rather than outlive a deploy in a CDN.
        res.set('Cache-Control', meta ? 'public, max-age=60' : 'no-cache')
        res.type('html').send(meta ? injectMetaTags(shell, meta) : shell)
      } catch (err) {
        next(err)
      }
    })
  }

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
