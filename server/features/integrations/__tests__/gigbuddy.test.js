import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEditorAccess, fetchExport, gigbuddyWebOrigin } from '../gigbuddy.js'

const originalEnv = {
  GIGBUDDY_URL: process.env.GIGBUDDY_URL,
  GIGBUDDY_WEB_URL: process.env.GIGBUDDY_WEB_URL,
  GIGBUDDY_EXPORT_TOKEN: process.env.GIGBUDDY_EXPORT_TOKEN,
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
    delete process.env.GIGBUDDY_EXPORT_TOKEN
    await expect(fetchExport('band')).rejects.toThrow('GIGBUDDY_URL / GIGBUDDY_EXPORT_TOKEN are not configured')
  })

  it('encodes the slug and authenticates the export request', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example/'
    process.env.GIGBUDDY_EXPORT_TOKEN = 'secret'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ songs: [1] }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExport('band name/slash')).resolves.toEqual({ content: { songs: [1] } })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.gigbuddy.example/api/public/linkpage/export/band%20name%2Fslash',
      { headers: { authorization: 'Bearer secret' }, signal: expect.any(AbortSignal) },
    )
  })

  it('gives up on an export GigBuddy never answers', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example'
    process.env.GIGBUDDY_EXPORT_TOKEN = 'secret'
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason))
    })))

    await expect(fetchExport('band', { timeoutMs: 20 })).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('distinguishes a missing export from an upstream failure', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example'
    process.env.GIGBUDDY_EXPORT_TOKEN = 'secret'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExport('missing')).resolves.toEqual({ notFound: true })
    await expect(fetchExport('broken')).rejects.toThrow('GigBuddy export failed with status 503')
  })

  it('confirms editor access only on an explicit allowed: true', async () => {
    process.env.GIGBUDDY_URL = 'https://api.gigbuddy.example'
    process.env.GIGBUDDY_EXPORT_TOKEN = 'secret'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ allowed: true }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ allowed: 'yes' }) })
      .mockResolvedValueOnce({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchEditorAccess(42, 5)).resolves.toBe(true)
    await expect(fetchEditorAccess(42, 5)).resolves.toBe(false)
    await expect(fetchEditorAccess(42, 5)).rejects.toThrow('GigBuddy access check failed with status 429')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.gigbuddy.example/api/public/linkpage/access/42/5',
      { headers: { authorization: 'Bearer secret' }, signal: expect.any(AbortSignal) },
    )
  })
})
