import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'

const originalEnv = { ...process.env }

function stalePagePool() {
  const page = {
    id: 1,
    slug: 'band',
    gigbuddy_tenant_id: 7,
    page_type: 'main',
    release: null,
    published_layout: { sections: [] },
    content: { band: { name: 'Band' } },
    content_synced_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  }
  return {
    page,
    query: async (sql, params = []) => {
      if (sql.includes('SET content =')) {
        page.content = JSON.parse(params[4])
        page.content_synced_at = new Date().toISOString()
        return { rows: [page] }
      }
      if (sql.includes('FROM pages WHERE slug')) return { rows: [structuredClone(page)] }
      return { rows: [] }
    },
  }
}

function exportResponse(content) {
  return { ok: true, status: 200, json: async () => content }
}

beforeEach(() => {
  process.env.GIGBUDDY_URL = 'https://gigbuddy.example'
  process.env.GIGBUDDY_EXPORT_TOKEN = 'export-token'
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  process.env = { ...originalEnv }
})

describe('public content refresh', () => {
  it('pulls one export for a burst of visitors on a stale page', async () => {
    let release
    const fetchMock = vi.fn(() => new Promise((resolve) => {
      release = () => resolve(exportResponse({ band: { name: 'Fresh' } }))
    }))
    vi.stubGlobal('fetch', fetchMock)
    const app = createApp(stalePagePool())

    const responses = await Promise.all(Array.from({ length: 25 }, () => request(app).get('/api/pages/band')))
    release()

    expect(responses.every((res) => res.status === 200)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('backs off after a failed refresh instead of retrying on every view', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createApp(stalePagePool())

    await request(app).get('/api/pages/band')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await request(app).get('/api/pages/band')
    await request(app).get('/api/pages/band')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 61 * 1000)
    await request(app).get('/api/pages/band')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('stops refreshing once the snapshot is fresh again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(exportResponse({ band: { name: 'Fresh' } }))
    vi.stubGlobal('fetch', fetchMock)
    const pool = stalePagePool()
    const app = createApp(pool)

    await request(app).get('/api/pages/band')
    await vi.waitFor(() => expect(pool.page.content.band.name).toBe('Fresh'))
    await request(app).get('/api/pages/band')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
