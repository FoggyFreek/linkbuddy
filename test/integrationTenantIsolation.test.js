import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/app.js'

// Tenant isolation for the GigBuddy integration reads. The shared secret
// authenticates GigBuddy as a whole, never one band — so the tenant id in the
// path is the ONLY thing standing between two bands' statistics, and every
// pages lookup has to carry it.
//
// The fake pool below is the mechanism that makes this a real test rather than
// a tautology: it holds BOTH tenants' rows, and applies a tenant filter only
// when the SQL it receives actually contains that predicate. Drop
// `gigbuddy_tenant_id` from a query and the other tenant's rows come straight
// back, failing these expectations.

const SECRET = 'isolation-test-secret'
const MINE = 42
const THEIRS = 43

const PAGES = [
  { id: 8, slug: 'alpha', gigbuddy_tenant_id: MINE, page_type: 'main', release: null, published_at: '2026-07-01T00:00:00.000Z', content: {} },
  { id: 9, slug: 'alpha/single', gigbuddy_tenant_id: MINE, page_type: 'release', release: { title: 'Alpha Single' }, published_at: null, content: {} },
  { id: 80, slug: 'beta', gigbuddy_tenant_id: THEIRS, page_type: 'main', release: null, published_at: '2026-07-02T00:00:00.000Z', content: {} },
  { id: 81, slug: 'beta/single', gigbuddy_tenant_id: THEIRS, page_type: 'release', release: { title: 'Beta Single' }, published_at: null, content: {} },
]

// Per-page counts, all distinct, so any leak names the page it came from.
const VIEWS = { 8: 11, 9: 22, 80: 3333, 81: 4444 }
const CLICKS = { 8: 1, 9: 2, 80: 333, 81: 444 }

beforeAll(() => {
  process.env.GIGBUDDY_SYNC_SECRET = SECRET
})

afterAll(() => {
  delete process.env.GIGBUDDY_SYNC_SECRET
  vi.restoreAllMocks()
})

function makePool() {
  const query = vi.fn(async (sql, params = []) => {
    if (sql.includes('FROM pages')) {
      let rows = PAGES
      // Each filter is applied only if the real SQL asks for it.
      if (sql.includes('gigbuddy_tenant_id = $1')) rows = rows.filter((p) => p.gigbuddy_tenant_id === params[0])
      if (sql.includes('gigbuddy_tenant_id = $2')) rows = rows.filter((p) => p.gigbuddy_tenant_id === params[1])
      // Bare `id = $1`, not the tail of `gigbuddy_tenant_id = $1`.
      if (/(?<![\w.])id = \$1/.test(sql)) rows = rows.filter((p) => p.id === params[0])
      // In the WHERE clause, not the list query's ORDER BY (page_type = 'main').
      if (sql.includes("AND page_type = 'main'")) rows = rows.filter((p) => p.page_type === 'main')
      return { rows }
    }
    // Statistics are keyed by the resolved page id alone — which is exactly why
    // resolving that id has to be tenant-scoped.
    const pageId = params[0]
    if (sql.includes('unique_visits')) {
      return { rows: [{ views: VIEWS[pageId] ?? 0, unique_visits: VIEWS[pageId] ?? 0 }] }
    }
    if (sql.includes('split_part')) {
      return { rows: [{ day: '2026-08-01', kind: 'platform', clicks: CLICKS[pageId] ?? 0 }] }
    }
    if (sql.includes('FROM page_clicks')) return { rows: [{ clicks: CLICKS[pageId] ?? 0 }] }
    if (sql.includes('FROM page_views')) return { rows: [{ day: '2026-08-01', views: VIEWS[pageId] ?? 0 }] }
    throw new Error(`unexpected query: ${sql}`)
  })
  return { query }
}

const bearer = (req) => req.set('authorization', `Bearer ${SECRET}`)
const statsFor = (app, tenantId, query = '') =>
  bearer(request(app).get(`/api/integrations/gigbuddy/tenants/${tenantId}/stats?days=7${query}`))
const pagesFor = (app, tenantId) =>
  bearer(request(app).get(`/api/integrations/gigbuddy/tenants/${tenantId}/pages`))

describe('GigBuddy integration reads are tenant-scoped', () => {
  it('lists only the calling tenant pages, never another tenant slug', async () => {
    const app = createApp(makePool())
    const res = await pagesFor(app, MINE)

    expect(res.status).toBe(200)
    expect(res.body.pages.map((p) => p.id)).toEqual([8, 9])
    const flat = JSON.stringify(res.body)
    expect(flat).not.toContain('beta')
    expect(flat).not.toContain('Beta Single')
  })

  it('answers each tenant with its own main page, though both exist', async () => {
    const app = createApp(makePool())

    const mine = await statsFor(app, MINE)
    expect(mine.body).toMatchObject({ pageId: 8, slug: 'alpha', totalViews: VIEWS[8] })

    const theirs = await statsFor(app, THEIRS)
    expect(theirs.body).toMatchObject({ pageId: 80, slug: 'beta', totalViews: VIEWS[80] })
  })

  // Page ids are global; pages are not. Asking for one you do not own must be
  // indistinguishable from asking for one that does not exist.
  it.each([80, 81])('404s page %s, which belongs to the other tenant', async (pageId) => {
    const app = createApp(makePool())
    const res = await statsFor(app, MINE, `&pageId=${pageId}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ code: 'page_not_found', error: 'Page not found' })
    // Not one number of theirs travelled with the refusal.
    const flat = JSON.stringify(res.body)
    for (const count of [VIEWS[80], VIEWS[81], CLICKS[80], CLICKS[81]]) {
      expect(flat).not.toContain(String(count))
    }
  })

  it('404s an unknown page id the same way as a foreign one', async () => {
    const res = await statsFor(createApp(makePool()), MINE, '&pageId=999999')
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('page_not_found')
  })

  it('serves a tenant its own release page when it asks for one it owns', async () => {
    const res = await statsFor(createApp(makePool()), MINE, '&pageId=9')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ pageId: 9, slug: 'alpha/single', totalViews: VIEWS[9] })
  })

  // Regression guard: a future "optimization" to look a page up by id alone
  // would still pass the happy-path tests above but break isolation.
  it('binds the tenant id into every pages lookup', async () => {
    const pool = makePool()
    const app = createApp(pool)
    await statsFor(app, MINE, '&pageId=9')
    await statsFor(app, MINE)
    await pagesFor(app, MINE)

    const pageLookups = pool.query.mock.calls.filter(([sql]) => sql.includes('FROM pages'))
    expect(pageLookups.length).toBeGreaterThanOrEqual(3)
    for (const [sql, params] of pageLookups) {
      expect(sql).toContain('gigbuddy_tenant_id')
      expect(params).toContain(MINE)
    }
  })

  it('reports no page for a tenant without one, though other tenants have pages', async () => {
    const res = await statsFor(createApp(makePool()), 99)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ hasPage: false })
  })

  it('leaves an empty page list for a tenant without pages', async () => {
    const res = await pagesFor(createApp(makePool()), 99)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pages: [] })
  })

  it('refuses both reads without the shared secret, whatever tenant is named', async () => {
    const pool = makePool()
    const app = createApp(pool)
    for (const path of [
      `/api/integrations/gigbuddy/tenants/${THEIRS}/stats?days=7`,
      `/api/integrations/gigbuddy/tenants/${THEIRS}/pages`,
    ]) {
      expect((await request(app).get(path)).status).toBe(401)
      expect((await request(app).get(path).set('authorization', 'Bearer wrong')).status).toBe(401)
    }
    expect(pool.query).not.toHaveBeenCalled()
  })
})
