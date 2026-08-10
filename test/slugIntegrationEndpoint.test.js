import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/app.js'
import { NamespaceError } from '../server/namespaceService.js'

const SECRET = 'integration-endpoint-secret'
const route = '/api/integrations/gigbuddy/tenants/42/slug'
const validBody = { oldSlug: 'old-band', newSlug: 'new-band', revision: 1 }

beforeAll(() => {
  process.env.GIGBUDDY_SYNC_SECRET = SECRET
  process.env.GIGBUDDY_URL = 'https://gigbuddy.test'
})

afterAll(() => {
  delete process.env.GIGBUDDY_SYNC_SECRET
  delete process.env.GIGBUDDY_URL
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

function appWith(migrate, query = async () => ({ rows: [] })) {
  return createApp({ query }, { migrateTenantNamespace: migrate })
}

function put(app, body = validBody, authorization = `Bearer ${SECRET}`) {
  return request(app).put(route).set('authorization', authorization).send(body)
}

describe('GigBuddy slug integration endpoint', () => {
  it('requires the shared-secret bearer before invoking the service', async () => {
    const migrate = vi.fn()
    const app = appWith(migrate)
    const missing = await request(app).put(route).send(validBody)
    const wrong = await put(app, validBody, 'Bearer wrong-secret')
    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(missing.body.code).toBe('unauthorized')
    expect(migrate).not.toHaveBeenCalled()
  })

  it('rejects malformed and oversized JSON bodies', async () => {
    const app = appWith(vi.fn())
    const malformed = await request(app)
      .put(route)
      .set('authorization', `Bearer ${SECRET}`)
      .set('content-type', 'application/json')
      .send('{')
    const oversized = await request(app)
      .put(route)
      .set('authorization', `Bearer ${SECRET}`)
      .send({ oldSlug: 'old', newSlug: 'new', revision: 1, padding: 'x'.repeat(300_000) })
    expect(malformed.status).toBe(400)
    expect(malformed.body.code).toBe('invalid_request')
    expect(oversized.status).toBe(413)
    expect(oversized.body.code).toBe('request_too_large')
  })

  it.each([
    ['/api/integrations/gigbuddy/tenants/not-a-number/slug', validBody],
    [route, { ...validBody, oldSlug: '-bad' }],
    [route, { ...validBody, newSlug: 'Bad/Slug' }],
    [route, { ...validBody, revision: 0 }],
    [route, { ...validBody, revision: 1.5 }],
    [route, { ...validBody, newSlug: validBody.oldSlug }],
  ])('rejects malformed commands before opening a transaction', async (path, body) => {
    const migrate = vi.fn()
    const res = await request(appWith(migrate))
      .put(path)
      .set('authorization', `Bearer ${SECRET}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('invalid_request')
    expect(migrate).not.toHaveBeenCalled()
  })

  it.each(['applied', 'already_applied', 'no_pages', 'stale_ignored'])(
    'returns 200 with the stable %s result code',
    async (code) => {
      const migrate = vi.fn().mockResolvedValue({ code })
      const res = await put(appWith(migrate))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ code })
      expect(migrate).toHaveBeenCalledWith(expect.anything(), {
        tenantId: 42,
        newSlug: 'new-band',
        revision: 1,
      })
    },
  )

  it.each(['slug_conflict', 'revision_gap', 'revision_conflict'])(
    'maps %s to a retry-safe conflict response',
    async (code) => {
      const migrate = vi.fn().mockRejectedValue(new NamespaceError(code, 'safe message'))
      const res = await put(appWith(migrate))
      expect(res.status).toBe(409)
      expect(res.body).toEqual({ code, error: 'safe message' })
    },
  )

  it('refreshes committed pages from the new slug without undoing on export failure', async () => {
    const main = {
      id: 8,
      slug: 'new-band',
      gigbuddy_tenant_id: 42,
      page_type: 'main',
      content: {},
    }
    const query = vi.fn(async (sql) => {
      if (sql.includes("page_type = 'main'")) return { rows: [main] }
      return { rows: [] }
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await put(appWith(vi.fn().mockResolvedValue({ code: 'applied' }), query))
    expect(res.status).toBe(200)
    expect(res.body.code).toBe('applied')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://gigbuddy.test/api/public/linkpage/export/new-band',
      expect.anything(),
    )
    expect(errorSpy).toHaveBeenCalledWith(
      'content refresh failed after namespace migration for tenant 42:',
      'offline',
    )
  })

  it('does not disclose the shared secret in responses or structured logs', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const res = await put(appWith(vi.fn().mockResolvedValue({ code: 'already_applied' })))
    expect(JSON.stringify(res.body)).not.toContain(SECRET)
    expect(JSON.stringify(info.mock.calls)).not.toContain(SECRET)
  })
})
