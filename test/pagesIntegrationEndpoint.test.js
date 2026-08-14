import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/app.js'

const SECRET = 'pages-endpoint-secret'
const route = '/api/integrations/gigbuddy/tenants/42/pages'

beforeAll(() => {
  process.env.GIGBUDDY_SYNC_SECRET = SECRET
})

afterAll(() => {
  delete process.env.GIGBUDDY_SYNC_SECRET
  vi.restoreAllMocks()
})

const rows = [
  { id: 8, slug: 'the-band', page_type: 'main', release: null, published_at: '2026-07-01T10:00:00.000Z' },
  {
    id: 9,
    slug: 'the-band/new-single',
    page_type: 'release',
    release: { songId: 3, title: 'New Single', artist: 'The Band' },
    published_at: null,
  },
]

function poolFor(pages) {
  return { query: vi.fn(async () => ({ rows: pages })) }
}

function get(pool, authorization = `Bearer ${SECRET}`) {
  return request(createApp(pool)).get(route).set('authorization', authorization)
}

describe('GigBuddy pages integration endpoint', () => {
  it('requires the shared-secret bearer before touching the database', async () => {
    const pool = poolFor(rows)
    const missing = await request(createApp(pool)).get(route)
    const wrong = await get(pool, 'Bearer wrong-secret')
    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('rejects a tenant id that is not a positive integer', async () => {
    const pool = poolFor(rows)
    const res = await request(createApp(pool))
      .get('/api/integrations/gigbuddy/tenants/nope/pages')
      .set('authorization', `Bearer ${SECRET}`)
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('invalid_request')
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('lists the tenant pages, main first, with the release snapshot', async () => {
    const pool = poolFor(rows)
    const res = await get(pool)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      pages: [
        {
          id: 8,
          slug: 'the-band',
          pageType: 'main',
          release: null,
          publishedAt: '2026-07-01T10:00:00.000Z',
        },
        {
          id: 9,
          slug: 'the-band/new-single',
          pageType: 'release',
          release: { songId: 3, title: 'New Single', artist: 'The Band' },
          publishedAt: null,
        },
      ],
    })
    // Only the tenant's own pages: the query is scoped, never filtered later.
    expect(pool.query.mock.calls[0][1]).toEqual([42])
  })

  it('answers an empty list for a tenant with no pages yet', async () => {
    const res = await get(poolFor([]))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pages: [] })
  })

  it('never leaks stored layouts or content snapshots', async () => {
    const res = await get(poolFor(rows))
    const flat = JSON.stringify(res.body)
    expect(flat).not.toContain('draft_layout')
    expect(flat).not.toContain('content')
    expect(flat).not.toContain(SECRET)
  })
})
