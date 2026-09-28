import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { EMBED_ORIGINS } from '../features/public-pages/embeds.js'
import { inlineScriptHashes } from '../securityHeaders.js'

const INLINE = "document.documentElement.dataset.theme = 'dark'"
let distDir

beforeAll(() => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkbuddy-dist-'))
  fs.writeFileSync(
    path.join(distDir, 'index.html'),
    `<!doctype html><html><head><title>Band Links</title><script>${INLINE}</script></head>` +
      '<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
  )
})

afterAll(() => {
  fs.rmSync(distDir, { recursive: true, force: true })
})

const pool = { query: async () => ({ rows: [] }) }

function directives(res) {
  return Object.fromEntries(
    res.headers['content-security-policy'].split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/)
      return [name, values]
    }),
  )
}

describe('cache headers behind a CDN', () => {
  it('keep every editor and integration response out of shared caches', async () => {
    process.env.GIGBUDDY_INTEGRATION_TOKEN = 'cache-test-token'
    const app = createApp(pool)
    try {
      const responses = [
        await request(app).get('/api/editor/pages'),
        await request(app).post('/api/editor/session').send({ token: 'nope' }),
        await request(app).get('/api/integrations/gigbuddy/tenants/1/pages'),
        await request(app).get('/api/integrations/gigbuddy/tenants/1/pages').set('authorization', 'Bearer cache-test-token'),
      ]
      expect(responses.map((res) => res.status)).toEqual([401, 401, 401, 200])
      for (const res of responses) expect(res.headers['cache-control']).toBe('private, no-store')
    } finally {
      delete process.env.GIGBUDDY_INTEGRATION_TOKEN
    }
  })

  it('leave published pages publicly cacheable', async () => {
    const page = { id: 1, slug: 'band', published_layout: { sections: [] }, content: {}, release: null, content_synced_at: new Date() }
    const res = await request(createApp({ query: async () => ({ rows: [page] }) })).get('/api/pages/band')

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
  })
})

describe('inline script hashes', () => {
  it('hash what the browser executes, with line endings normalized to LF', () => {
    const body = "\r\n  var mode = 'dark';\r\n  var legacy = 1;\r"
    const browserText = "\n  var mode = 'dark';\n  var legacy = 1;\n"
    const expected = crypto.createHash('sha256').update(browserText).digest('base64')

    expect(inlineScriptHashes(`<head><script>${body}</script><script src="/x.js"></script></head>`))
      .toEqual([`'sha256-${expected}'`])
  })
})

describe('security headers', () => {
  it('lock down every response', async () => {
    const res = await request(createApp(pool)).get('/api/health')
    const csp = directives(res)

    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['script-src']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['connect-src']).toEqual(["'self'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('only frame the embed players the resolver can emit', async () => {
    const csp = directives(await request(createApp(pool)).get('/api/health'))
    expect(csp['frame-src']).toEqual(EMBED_ORIGINS)
  })

  it('keep sending an origin referrer, which embedded players require', async () => {
    const res = await request(createApp(pool)).get('/api/health')
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  it("allow the shell's own inline script by hash and nothing else inline", async () => {
    const res = await request(createApp(pool, { distDir })).get('/edit')
    const hash = crypto.createHash('sha256').update(INLINE).digest('base64')

    expect(res.status).toBe(200)
    expect(directives(res)['script-src']).toEqual(["'self'", `'sha256-${hash}'`])
  })
})
