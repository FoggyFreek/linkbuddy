// Dedicated Postgres pool for the linkpage app. Statistics and page layouts
// live in their own database — this app never connects to gigbuddy's.
import pg from 'pg'

// Fail a request rather than hang when Postgres is unreachable, and cap how
// long a single statement can pin a connection.
const POOL_DEFAULTS = {
  max: Number(process.env.LINKPAGE_PG_POOL_MAX) || 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
}

// A connection string with an unencoded password (`@`, `:`, `/`, `#`, `%` in
// POSTGRES_PASSWORD) mis-parses into a nonsense host/user, which surfaces much
// later as a confusing auth error. Catch it at boot instead.
function assertUsableUrl(raw) {
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(
      'LINKPAGE_DATABASE_URL is not a valid URL — if the password contains @ : / # or %, percent-encode it',
    )
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error(`LINKPAGE_DATABASE_URL must use the postgres:// scheme, got "${parsed.protocol}//"`)
  }
  // A raw `#` ends the URL early (the rest becomes a fragment) and a raw `/`
  // ends the authority (the rest becomes extra path segments). Both parse
  // cleanly while pointing at the wrong host, so reject the shapes they leave.
  if (parsed.hash) {
    throw new Error('LINKPAGE_DATABASE_URL contains a "#" — percent-encode it as %23 if it is part of the password')
  }
  if (parsed.pathname.replace(/^\//, '').includes('/')) {
    throw new Error('LINKPAGE_DATABASE_URL has extra path segments — percent-encode any "/" in the password as %2F')
  }
}

export function createPool() {
  const url = process.env.LINKPAGE_DATABASE_URL
  let pool
  if (url) {
    assertUsableUrl(url)
    pool = new pg.Pool({ ...POOL_DEFAULTS, connectionString: url })
  } else {
    // Host/user/password/port come from the standard PG* env vars via the
    // driver; only the database name is forced to the linkpage-specific one so
    // a stray PGDATABASE can never point this app at gigbuddy's database.
    pool = new pg.Pool({
      ...POOL_DEFAULTS,
      database: process.env.LINKPAGE_PGDATABASE || 'gigbuddy_linkpage',
    })
  }

  // Idle clients emit 'error' when the server restarts or a proxy drops the
  // connection. Without a listener Node treats it as an unhandled 'error'
  // event and kills the process; the pool discards the client either way.
  pool.on('error', (err) => {
    console.error('postgres idle client error:', err.message)
  })

  return pool
}
