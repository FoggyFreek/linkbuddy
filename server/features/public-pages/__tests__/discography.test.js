import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { validateLayout } from '../../editor/layout.js'
import { signPayload } from '../../editor/tokens.js'
import { resolvePage } from '../resolve.js'

const raw = { sections: [{ id: 'music', title: null, widgets: [{ id: 'd', type: 'discography', title: ' Records ', discography: [{ title: 'Forged' }] }] }] }

describe('discography content contract', () => {
  it('accepts the widget and resolves albums only from synced content', () => {
    const { layout, error } = validateLayout(raw)
    expect(error).toBeUndefined()
    expect(layout.sections[0].widgets[0]).toEqual({ id: 'd', type: 'discography', title: 'Records' })
    const discography = [{ id: 2, title: 'Nightfall', artist: 'The Band', releaseDate: '2020-05-21', coverUrl: 'https://example.org/art' }]
    expect(resolvePage({ discography }, layout).sections[0].widgets[0]).toEqual({ id: 'd', type: 'discography', title: 'Records', discography })
  })

  it('hides empty discography from older or newly synced snapshots', () => {
    for (const content of [{}, { discography: [] }]) {
      expect(resolvePage(content, raw).sections).toEqual([])
    }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GIGBUDDY_SYNC_SECRET
  delete process.env.GIGBUDDY_URL
})

it('removes albums from the published collection when a later GigBuddy export omits them', async () => {
  process.env.GIGBUDDY_SYNC_SECRET = 'discography-test-secret'
  process.env.GIGBUDDY_URL = 'https://gigbuddy.test'
  const retained = { id: 1, title: 'Retained', releaseDate: '2020-01-01' }
  const removed = { id: 2, title: 'Removed', releaseDate: '2021-01-01' }
  const layout = { sections: [{ id: 'music', title: null, widgets: [{ id: 'd', type: 'discography', title: 'Records' }] }] }
  const page = {
    id: 7, slug: 'the-band', gigbuddy_tenant_id: 42, page_type: 'main',
    draft_layout: layout, published_layout: layout, release: null,
    content: { discography: [retained, removed] }, content_synced_at: new Date(),
  }
  const query = vi.fn(async (sql, params = []) => {
    if (sql.includes('FROM gigbuddy_tenant_namespaces') && !sql.includes('WITH current_namespace')) {
      return { rows: [{ gigbuddy_tenant_id: 42, main_slug: 'the-band', slug_revision: 1 }] }
    }
    if (sql.includes('SET content =')) {
      page.content = JSON.parse(params[4])
      page.content_synced_at = new Date()
      return { rows: [page] }
    }
    if (sql.includes('WHERE id = $1 AND gigbuddy_tenant_id = $2')) {
      return { rows: params[0] === page.id && params[1] === 42 ? [page] : [] }
    }
    if (sql.includes('WHERE slug = $1')) return { rows: params[0] === page.slug ? [page] : [] }
    throw new Error(`Unexpected query: ${sql}`)
  })
  const app = createApp({ query })
  const session = signPayload({ t: 'session', tenantId: 42, mainSlug: 'the-band', slugRevision: 1, exp: Math.floor(Date.now() / 1000) + 600 })
  const publicAlbums = async () => {
    const res = await request(app).get('/api/pages/the-band')
    expect(res.status).toBe(200)
    return res.body.sections[0]?.widgets[0]?.discography || []
  }
  expect(await publicAlbums()).toEqual([retained, removed])

  const exportContent = { discography: [retained] }
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => exportContent }))
  vi.stubGlobal('fetch', fetchMock)
  const refresh = () => request(app).post('/api/editor/pages/7/refresh-content').set('Authorization', `Bearer ${session}`)
  const first = await refresh()
  expect(first.status).toBe(200)
  expect(first.body.content.discography).toEqual([retained])
  expect(page.content.discography).toEqual([retained])
  expect(await publicAlbums()).toEqual([retained])

  exportContent.discography = []
  const second = await refresh()
  expect(second.status).toBe(200)
  expect(second.body.content.discography).toEqual([])
  expect(page.content.discography).toEqual([])
  const empty = await request(app).get('/api/pages/the-band')
  expect(empty.status).toBe(200)
  expect(empty.body.sections).toEqual([])
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith('https://gigbuddy.test/api/public/linkpage/export/the-band', {
    headers: { authorization: 'Bearer discography-test-secret' },
  })
  expect(query.mock.calls.filter(([sql]) => sql.includes('SET content ='))).toHaveLength(2)
})
