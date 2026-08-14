import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/app.js'

const SECRET = 'stats-endpoint-secret'
const route = '/api/integrations/gigbuddy/tenants/42/stats'

beforeAll(() => {
  process.env.GIGBUDDY_SYNC_SECRET = SECRET
})

afterAll(() => {
  delete process.env.GIGBUDDY_SYNC_SECRET
  delete process.env.STATS_DISABLED
  vi.restoreAllMocks()
})

const mainPage = { id: 8, slug: 'the-band', gigbuddy_tenant_id: 42, page_type: 'main', content: {} }
const releasePage = { id: 9, slug: 'the-band/new-single', gigbuddy_tenant_id: 42, page_type: 'release', content: {} }

// Fake pool: the page lookups plus the four aggregate queries summaryStats
// issues, matched on the fragments that make each one unique. `byId` stands in
// for the tenant-scoped single-page lookup.
function poolFor(page, { views = [], clicks = [], viewsByDay = [], clicksByDay = [], byId = [] } = {}) {
  const query = vi.fn(async (sql, params) => {
    if (sql.includes("page_type = 'main'")) return { rows: page ? [page] : [] }
    if (sql.includes('id = $1 AND gigbuddy_tenant_id = $2')) {
      return { rows: byId.filter((p) => p.id === params[0] && p.gigbuddy_tenant_id === params[1]) }
    }
    if (sql.includes('unique_visits')) return { rows: views }
    if (sql.includes('split_part')) return { rows: clicksByDay }
    if (sql.includes('page_clicks')) return { rows: clicks }
    if (sql.includes('page_views')) return { rows: viewsByDay }
    throw new Error(`unexpected query: ${sql} ${JSON.stringify(params)}`)
  })
  return { query }
}

function get(pool, query = '', authorization = `Bearer ${SECRET}`) {
  return request(createApp(pool)).get(`${route}${query}`).set('authorization', authorization)
}

describe('GigBuddy stats integration endpoint', () => {
  it('requires the shared-secret bearer before touching the database', async () => {
    const pool = poolFor(mainPage)
    const missing = await request(createApp(pool)).get(route)
    const wrong = await get(pool, '', 'Bearer wrong-secret')
    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(missing.body.code).toBe('unauthorized')
    expect(pool.query).not.toHaveBeenCalled()
  })

  it.each(['/api/integrations/gigbuddy/tenants/not-a-number/stats', '/api/integrations/gigbuddy/tenants/0/stats'])(
    'rejects %s without querying',
    async (path) => {
      const pool = poolFor(mainPage)
      const res = await request(createApp(pool)).get(path).set('authorization', `Bearer ${SECRET}`)
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('invalid_request')
      expect(pool.query).not.toHaveBeenCalled()
    },
  )

  it('reports the absence of a link page instead of failing', async () => {
    const res = await get(poolFor(null))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ hasPage: false })
  })

  it('returns the summary and the merged daily series for the tenant main page', async () => {
    const pool = poolFor(mainPage, {
      views: [{ views: 200, unique_visits: 120 }],
      clicks: [{ clicks: 50 }],
      viewsByDay: [{ day: '2026-08-01', views: 12 }, { day: '2026-08-02', views: 8 }],
      clicksByDay: [
        { day: '2026-08-01', kind: 'platform', clicks: 3 },
        { day: '2026-08-02', kind: 'shop', clicks: 1 },
      ],
    })
    const res = await get(pool, '?days=7')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      hasPage: true,
      pageId: 8,
      slug: 'the-band',
      days: 7,
      retentionDays: 30,
      enabled: true,
      totalViews: 200,
      uniqueVisits: 120,
      totalClicks: 50,
      clickThroughRate: 25,
      byDay: [
        { day: '2026-08-01', views: 12, clicks: { platform: 3 } },
        { day: '2026-08-02', views: 8, clicks: { shop: 1 } },
      ],
    })
    // No per-dimension breakdown leaves the service: the tile only ever sees
    // totals and the daily series.
    expect(res.body.byDevice).toBeUndefined()
    expect(res.body.byCountry).toBeUndefined()
  })

  it.each([
    ['?days=90', 30, {}],
    ['?days=90', 90, { entitlements: { statsRetentionDays: 90 } }],
    ['', 30, {}],
    ['?days=0', 30, {}],
    ['?days=-5', 1, {}],
    ['?days=abc', 30, {}],
  ])('clamps %s to the plan window', async (query, expected, content) => {
    const pool = poolFor({ ...mainPage, content }, { views: [{ views: 0, unique_visits: 0 }], clicks: [{ clicks: 0 }] })
    const res = await get(pool, query)
    expect(res.status).toBe(200)
    expect(res.body.days).toBe(expected)
  })

  it('reports collection being switched off at server level', async () => {
    process.env.STATS_DISABLED = '1'
    try {
      const pool = poolFor(mainPage, { views: [{ views: 0, unique_visits: 0 }], clicks: [{ clicks: 0 }] })
      const res = await get(pool)
      expect(res.body.enabled).toBe(false)
    } finally {
      delete process.env.STATS_DISABLED
    }
  })

  it('reports a specific page when asked for one by id', async () => {
    const pool = poolFor(mainPage, {
      byId: [releasePage],
      views: [{ views: 30, unique_visits: 20 }],
      clicks: [{ clicks: 3 }],
    })
    const res = await get(pool, `?days=7&pageId=${releasePage.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ hasPage: true, pageId: 9, slug: 'the-band/new-single', totalViews: 30 })
    // The tenant-scoped lookup replaces the main-page one entirely.
    expect(pool.query.mock.calls.some(([sql]) => sql.includes("page_type = 'main'"))).toBe(false)
  })

  // Isolation: page ids are global, tenants are not. A page belonging to
  // another tenant must be indistinguishable from one that does not exist.
  it('404s a page id that belongs to another tenant', async () => {
    const pool = poolFor(mainPage, { byId: [{ ...releasePage, gigbuddy_tenant_id: 43 }] })
    const res = await get(pool, `?days=7&pageId=${releasePage.id}`)
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('page_not_found')
  })

  it.each(['abc', '0', '-3', '1.5'])('rejects the malformed page id %s', async (pageId) => {
    const pool = poolFor(mainPage)
    const res = await get(pool, `?days=7&pageId=${pageId}`)
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('invalid_request')
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('never discloses the shared secret in its response', async () => {
    const pool = poolFor(mainPage, { views: [{ views: 1, unique_visits: 1 }], clicks: [{ clicks: 0 }] })
    const res = await get(pool)
    expect(JSON.stringify(res.body)).not.toContain(SECRET)
    expect(res.body.clickThroughRate).toBe(0)
  })
})
