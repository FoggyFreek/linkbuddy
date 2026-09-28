import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { signSession } from '../tokens.js'
import { configureCredentials } from '../../../__tests__/credentials.js'

// GigBuddy stays the authority on who may edit: a session only works while
// GigBuddy keeps confirming its member's access, and only for the tenant's
// current namespace.

const TENANT = 42
const MEMBER = 5
const RECHECK_MS = 5 * 60 * 1000
const layout = { sections: [{ id: 's', title: null, widgets: [] }] }

function makePool({ mainSlug = 'the-band' } = {}) {
  const pages = [
    { id: 7, slug: 'the-band', gigbuddy_tenant_id: TENANT, page_type: 'main', release: null, draft_layout: layout, published_layout: null, content: {} },
    { id: 8, slug: 'the-band/single', gigbuddy_tenant_id: TENANT, page_type: 'release', release: { songId: 1, title: 'Single' }, draft_layout: layout, published_layout: null, content: {} },
  ]
  const writes = []
  const query = async (sql, params = []) => {
    if (sql.includes('FROM gigbuddy_tenant_namespaces')) {
      return { rows: params[0] === TENANT ? [{ gigbuddy_tenant_id: TENANT, main_slug: mainSlug, slug_revision: '1' }] : [] }
    }
    if (/^\s*(UPDATE|DELETE|INSERT)/.test(sql)) {
      writes.push(sql.trim().split(/\s+/).slice(0, 3).join(' '))
      const page = pages.find((p) => p.id === params[0])
      return { rows: page ? [{ ...page, published_at: new Date() }] : [], rowCount: page ? 1 : 0 }
    }
    if (sql.includes('FROM pages') && sql.includes('id = $1 AND gigbuddy_tenant_id = $2')) {
      return { rows: pages.filter((p) => p.id === params[0] && p.gigbuddy_tenant_id === params[1]) }
    }
    if (sql.includes('FROM pages') && sql.includes('WHERE slug = $1')) {
      return { rows: pages.filter((p) => p.slug === params[0]) }
    }
    if (sql.includes('FROM pages')) return { rows: pages.filter((p) => p.gigbuddy_tenant_id === params[0]) }
    return { rows: [{ views: 0, unique_visits: 0 }] }
  }
  return { query, writes }
}

const gigbuddy = { allowed: true, down: false }
let accessCalls

function session(extra = {}) {
  return signSession({
    t: 'session', tenantId: TENANT, userId: MEMBER, mainSlug: 'the-band', slugRevision: 1,
    exp: Math.floor(Date.now() / 1000) + 600, ...extra,
  })
}

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`)
const draft = (app, token = session()) => as(token)(request(app).put('/api/editor/pages/7/draft')).send({ layout })

const EDITOR_ROUTES = [
  ['get', '/api/editor/pages'],
  ['post', '/api/editor/pages', { songId: 1, slug: 'x' }],
  ['get', '/api/editor/pages/7'],
  ['put', '/api/editor/pages/7/draft', { layout }],
  ['get', '/api/editor/pages/7/preview'],
  ['post', '/api/editor/pages/7/publish'],
  ['post', '/api/editor/pages/7/refresh-content'],
  ['get', '/api/editor/pages/7/stats'],
  ['delete', '/api/editor/pages/8'],
  ['post', '/api/editor/unfurl', { url: 'https://example.com' }],
]

function callRoute(app, [method, path, body], token = session()) {
  const req = as(token)(request(app)[method](path))
  return body ? req.send(body) : req
}

beforeEach(() => {
  configureCredentials()
  process.env.GIGBUDDY_URL = 'https://gigbuddy.test'
  Object.assign(gigbuddy, { allowed: true, down: false })
  accessCalls = []
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    if (String(url).includes('/api/public/linkpage/access/')) {
      accessCalls.push({ url: String(url), authorization: init?.headers?.authorization })
      if (gigbuddy.down) throw new TypeError('fetch failed')
      return { ok: true, status: 200, json: async () => ({ allowed: gigbuddy.allowed }) }
    }
    throw new Error(`unexpected fetch ${url}`)
  }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('editor access', () => {
  it('asks GigBuddy about the session member once per recheck window', async () => {
    const pool = makePool()
    const app = createApp(pool)

    const saved = await draft(app)
    expect(saved.status).toBe(200)
    expect(saved.headers['cache-control']).toBe('private, no-store')
    expect((await as(session())(request(app).post('/api/editor/pages/7/publish'))).status).toBe(200)

    expect(accessCalls).toEqual([{
      url: `https://gigbuddy.test/api/public/linkpage/access/${TENANT}/${MEMBER}`,
      authorization: 'Bearer test-export-token',
    }])
  })

  it('ends a session within the recheck window once GigBuddy revokes access', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const pool = makePool()
    const app = createApp(pool)
    expect((await draft(app)).status).toBe(200)

    gigbuddy.allowed = false
    vi.setSystemTime(Date.now() + RECHECK_MS + 1000)
    const res = await draft(app)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/reopen the editor from GigBuddy/)
    expect(pool.writes).toHaveLength(1)
  })

  it('refuses every editor route to a member GigBuddy no longer confirms', async () => {
    gigbuddy.allowed = false
    const pool = makePool()
    const app = createApp(pool)

    for (const route of EDITOR_ROUTES) {
      expect((await callRoute(app, route)).status, route.join(' ')).toBe(401)
    }
    expect(pool.writes).toEqual([])
  })

  it('fails closed while GigBuddy cannot confirm access', async () => {
    gigbuddy.down = true
    const pool = makePool()

    const res = await draft(createApp(pool))

    expect(res.status).toBe(503)
    expect(pool.writes).toEqual([])
  })

  it('keeps each member answer to that member', async () => {
    const app = createApp(makePool())
    expect((await draft(app)).status).toBe(200)

    gigbuddy.allowed = false
    expect((await draft(app, session({ userId: 6 }))).status).toBe(401)
    expect((await draft(app)).status).toBe(200)
  })

  it('refuses a session that names no member, without asking GigBuddy', async () => {
    const pool = makePool()
    const res = await draft(createApp(pool), session({ userId: undefined }))

    expect(res.status).toBe(401)
    expect(accessCalls).toEqual([])
    expect(pool.writes).toEqual([])
  })

  it('refuses every editor route once the tenant namespace has moved', async () => {
    const pool = makePool({ mainSlug: 'renamed-band' })
    const app = createApp(pool)

    for (const route of EDITOR_ROUTES) {
      expect((await callRoute(app, route)).status, route.join(' ')).toBe(401)
    }
    expect(pool.writes).toEqual([])
  })
})
