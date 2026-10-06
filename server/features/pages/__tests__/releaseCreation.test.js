import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { signSession } from '../../editor/tokens.js'
import { configureCredentials } from '../../../__tests__/credentials.js'

const TENANT = 42
const content = {
  band: { name: 'The Band' },
  songs: [
    { id: 1, title: 'Single', artist: 'The Band', links: [{ label: 'Spotify', url: 'https://open.spotify.com/track/1' }] },
    { id: 2, title: 'Demo', artist: null, links: [] },
  ],
  albums: [
    { id: 5, title: 'Debut LP', artist: 'The Band', links: [{ label: 'Spotify', url: 'https://open.spotify.com/album/5' }], tracks: [] },
    { id: 6, title: 'Unreleased', artist: null, links: [], tracks: [] },
  ],
}

function makePool() {
  const pages = [{ id: 7, slug: 'the-band', gigbuddy_tenant_id: TENANT, page_type: 'main', release: null, content, created_at: new Date() }]
  const query = async (sql, params = []) => {
    if (sql.includes('INSERT INTO pages')) {
      if (pages.some((p) => p.slug === params[0])) return { rows: [] }
      const page = {
        id: pages.length + 7, slug: params[0], gigbuddy_tenant_id: params[1], page_type: 'release',
        release: JSON.parse(params[2]), draft_layout: JSON.parse(params[3]), content: JSON.parse(params[4]),
      }
      pages.push(page)
      return { rows: [page] }
    }
    if (sql.includes('FROM gigbuddy_tenant_namespaces')) {
      return { rows: [{ gigbuddy_tenant_id: TENANT, main_slug: 'the-band', slug_revision: '1' }] }
    }
    if (sql.includes('WHERE slug = $1')) return { rows: pages.filter((p) => p.slug === params[0]) }
    if (sql.includes('FROM pages')) return { rows: pages.filter((p) => p.gigbuddy_tenant_id === params[0]) }
    return { rows: [] }
  }
  return { query, pages }
}

const token = () => signSession({
  t: 'session', tenantId: TENANT, userId: 5, mainSlug: 'the-band', slugRevision: 1,
  exp: Math.floor(Date.now() / 1000) + 600,
})

function create(app, body) {
  return request(app).post('/api/editor/pages').set('Authorization', `Bearer ${token()}`).send(body)
}

beforeEach(() => {
  configureCredentials()
  process.env.GIGBUDDY_URL = 'https://gigbuddy.test'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ allowed: true }) })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('creating a release page', () => {
  it('creates an album smart link seeded with the album platform buttons', async () => {
    const pool = makePool()
    const res = await create(createApp(pool), { albumId: 5, slug: 'debut-lp' })

    expect(res.status).toBe(201)
    expect(res.body.page).toMatchObject({ slug: 'the-band/debut-lp', pageType: 'release', release: { albumId: 5, title: 'Debut LP', artist: 'The Band' } })
    const stored = pool.pages.find((p) => p.slug === 'the-band/debut-lp')
    expect(stored.release).toEqual({ albumId: 5, title: 'Debut LP', artist: 'The Band' })
    expect(stored.draft_layout.sections[0].widgets).toEqual([{ id: expect.any(String), type: 'platforms', albumId: 5, title: null }])
  })

  it('still creates a song smart link', async () => {
    const pool = makePool()
    const res = await create(createApp(pool), { songId: 1, slug: 'single' })

    expect(res.status).toBe(201)
    const stored = pool.pages.find((p) => p.slug === 'the-band/single')
    expect(stored.release).toEqual({ songId: 1, title: 'Single', artist: 'The Band' })
    expect(stored.draft_layout.sections[0].widgets).toEqual([{ id: expect.any(String), type: 'platforms', songId: 1, title: null }])
  })

  it('refuses a release without streaming links, an unknown one, or two at once', async () => {
    const pool = makePool()
    const app = createApp(pool)

    const unlinked = await create(app, { albumId: 6, slug: 'unreleased' })
    expect(unlinked.status).toBe(400)
    expect(unlinked.body.error).toMatch(/Unreleased.*no streaming links/)
    expect((await create(app, { albumId: 99, slug: 'nope' })).status).toBe(400)
    expect((await create(app, { songId: 1, albumId: 5, slug: 'both' })).status).toBe(400)
    expect(pool.pages.filter((p) => p.page_type === 'release')).toEqual([])
  })

  it('reads ids by the same rule as a platforms widget', async () => {
    const pool = makePool()
    const app = createApp(pool)

    expect((await create(app, { albumId: true, slug: 'flag' })).status).toBe(400)
    expect((await create(app, { albumId: [5], slug: 'list' })).status).toBe(400)
    expect(pool.pages.filter((p) => p.page_type === 'release')).toEqual([])

    const res = await create(app, { songId: 1, albumId: 0, slug: 'single' })
    expect(res.status).toBe(201)
    expect(pool.pages.find((p) => p.slug === 'the-band/single').release).toMatchObject({ songId: 1 })
  })
})
