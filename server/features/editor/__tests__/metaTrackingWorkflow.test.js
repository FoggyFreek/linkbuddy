import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { signSession } from '../tokens.js'
import { configureCredentials } from '../../../__tests__/credentials.js'

const settings = { pixelId: '123456789012345', platforms: ['spotify'] }
const layout = { sections: [] }

function fixture() {
  const pages = [
    { id: 1, slug: 'band', gigbuddy_tenant_id: 42, page_type: 'main', release: null },
    { id: 2, slug: 'band/single', gigbuddy_tenant_id: 42, page_type: 'release', release: { songId: 12, title: 'Single' } },
    { id: 3, slug: 'other/single', gigbuddy_tenant_id: 99, page_type: 'release', release: { albumId: 4, title: 'Album' } },
  ].map((page) => ({ ...page, draft_layout: structuredClone(layout), published_layout: structuredClone(layout), content: {}, content_synced_at: new Date() }))
  const pool = { query: async (sql, params = []) => {
    if (sql.includes('FROM gigbuddy_tenant_namespaces')) return { rows: [{ gigbuddy_tenant_id: 42, main_slug: 'band', slug_revision: '1' }] }
    const page = pages.find(({ id }) => id === params[0])
    if (sql.startsWith('UPDATE pages SET draft_layout')) {
      page.draft_layout = JSON.parse(params[1])
      return { rows: [], rowCount: 1 }
    }
    if (sql.includes('SET published_layout = draft_layout')) {
      page.published_layout = structuredClone(page.draft_layout)
      page.published_at = new Date()
      return { rows: [page], rowCount: 1 }
    }
    if (sql.includes('WHERE id = $1 AND gigbuddy_tenant_id = $2')) return { rows: page?.gigbuddy_tenant_id === params[1] ? [page] : [] }
    if (sql.includes('WHERE slug = $1')) return { rows: pages.filter(({ slug }) => slug === params[0]) }
    throw new Error(`Unexpected SQL: ${sql}`)
  } }
  const app = createApp(pool)
  const token = signSession({ t: 'session', tenantId: 42, userId: 5, mainSlug: 'band', slugRevision: 1, exp: Math.floor(Date.now() / 1000) + 600 })
  const authed = (req) => req.set('Authorization', `Bearer ${token}`)
  const save = (id, metaTracking) => authed(request(app).put(`/api/editor/pages/${id}/draft`)).send({ layout: { ...layout, metaTracking } })
  return { pages, app, authed, save }
}

beforeEach(() => {
  configureCredentials()
  process.env.GIGBUDDY_URL = 'https://gigbuddy.test'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ allowed: true }) })))
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('tracking save/publish workflow', () => {
  it('keeps tracking in the draft until publish and removes it when disabled and republished', async () => {
    const { pages, app, authed, save } = fixture()
    expect((await save(2, settings)).status).toBe(200)
    expect(pages[1].draft_layout.metaTracking).toEqual(settings)
    expect((await request(app).get('/api/pages/band/single')).body.metaTracking).toBeUndefined()
    const preview = await authed(request(app).get('/api/editor/pages/2/preview'))
    expect(preview.body.metaTracking).toEqual({ ...settings, releaseId: 'song:12' })
    expect((await authed(request(app).post('/api/editor/pages/2/publish'))).status).toBe(200)
    expect((await request(app).get('/api/pages/band/single')).body.metaTracking).toEqual({ ...settings, releaseId: 'song:12' })
    expect((await save(2, null)).status).toBe(200)
    expect((await request(app).get('/api/pages/band/single')).body.metaTracking).toBeDefined()
    await authed(request(app).post('/api/editor/pages/2/publish'))
    expect((await request(app).get('/api/pages/band/single')).body.metaTracking).toBeUndefined()
  })

  it('rejects main-page settings and prevents changes to another tenant', async () => {
    const { pages, app, save } = fixture()
    expect((await save(1, settings)).status).toBe(400)
    expect((await save(3, settings)).status).toBe(404)
    expect((await request(app).put('/api/editor/pages/2/draft').send({ layout: { ...layout, metaTracking: settings } })).status).toBe(401)
    expect(pages.every((page) => !page.draft_layout.metaTracking)).toBe(true)
  })
})
