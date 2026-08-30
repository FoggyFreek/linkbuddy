import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchExport, gigbuddyWebOrigin } from '../gigbuddy.js'

const originalEnv = {
  GIGBUDDY_URL: process.env.GIGBUDDY_URL,
  GIGBUDDY_WEB_URL: process.env.GIGBUDDY_WEB_URL,
  GIGBUDDY_SYNC_SECRET: process.env.GIGBUDDY_SYNC_SECRET,
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('GigBuddy content export client', () => {
  it('normalizes the public web origin without guessing a fallback', () => {
    process.env.GIGBUDDY_WEB_URL = 'https://gigbuddy.example/'
    expect(gigbuddyWebOrigin()).toBe('https://gigbuddy.example')
    delete process.env.GIGBUDDY_WEB_URL
    expect(gigbuddyWebOrigin()).toBe('')
  })

  it('requires both the API origin and shared secret', async () => {
    delete process.env.GIGBUDDY_URL
    delete process.env.GIGBUDDY_SYNC_SECRET
    await expect(fetchExport('band')).rejects.toThrow('GIGBUDDY_URL / GIGBUDDY_SYNC_SECRET are not configured')
  })

  it('encodes the slug and authenticates the export request', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example/'
    process.env.GIGBUDDY_SYNC_SECRET = 'secret'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ songs: [1] }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExport('band name/slash')).resolves.toEqual({ content: { songs: [1] } })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.gigbuddy.example/api/public/linkpage/export/band%20name%2Fslash',
      { headers: { authorization: 'Bearer secret' } },
    )
  })

  it('distinguishes a missing export from an upstream failure', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example'
    process.env.GIGBUDDY_SYNC_SECRET = 'secret'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExport('missing')).resolves.toEqual({ notFound: true })
    await expect(fetchExport('broken')).rejects.toThrow('GigBuddy export failed with status 503')
  })
})
