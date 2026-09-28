// Fixed-window, in-memory rate limiter. Expired windows are swept at most once
// per window, so the key map stays bounded by the callers of the last window.
export function createRateLimiter({
  limit,
  windowMs,
  key = (req) => req.ip || 'unknown',
  body = { error: 'Too many requests' },
}) {
  const clients = new Map()
  let lastSweep = Date.now()

  function sweep(now) {
    if (now - lastSweep < windowMs) return
    for (const [name, entry] of clients) {
      if (now - entry.startedAt >= windowMs) clients.delete(name)
    }
    lastSweep = now
  }

  const middleware = (req, res, next) => {
    const now = Date.now()
    sweep(now)
    const name = key(req)
    let entry = clients.get(name)
    if (!entry || now - entry.startedAt >= windowMs) {
      entry = { startedAt: now, count: 0 }
      clients.set(name, entry)
    }
    entry.count += 1
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.startedAt + windowMs - now) / 1000))))
      return res.status(429).json(body)
    }
    next()
  }
  middleware.trackedKeys = () => clients.size
  return middleware
}
