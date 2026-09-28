import { afterEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createRateLimiter } from '../rateLimiter.js'

function appWith(limiter) {
  const app = express()
  app.get('/', limiter, (_req, res) => res.status(204).end())
  return app
}

afterEach(() => {
  vi.useRealTimers()
})

describe('rate limiter', () => {
  it('limits each key separately within a window and answers 429 with Retry-After', async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, key: (req) => req.get('x-key'), body: { error: 'slow down' } })
    const app = appWith(limiter)

    expect((await request(app).get('/').set('x-key', 'a')).status).toBe(204)
    expect((await request(app).get('/').set('x-key', 'a')).status).toBe(204)
    const limited = await request(app).get('/').set('x-key', 'a')
    expect(limited.status).toBe(429)
    expect(limited.body).toEqual({ error: 'slow down' })
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
    expect((await request(app).get('/').set('x-key', 'b')).status).toBe(204)
  })

  it('opens a new window once the old one has passed and forgets idle callers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, key: (req) => req.get('x-key') })
    const app = appWith(limiter)
    for (const key of ['a', 'b', 'c']) await request(app).get('/').set('x-key', key)
    expect((await request(app).get('/').set('x-key', 'a')).status).toBe(429)
    expect(limiter.trackedKeys()).toBe(3)

    vi.setSystemTime(Date.now() + 60_000)
    expect((await request(app).get('/').set('x-key', 'a')).status).toBe(204)
    expect(limiter.trackedKeys()).toBe(1)
  })
})
