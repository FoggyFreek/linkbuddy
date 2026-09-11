// Production entry point: API + built SPA assets in one process, mirroring
// the gigbuddy deployment shape. Run `npm run migrate` before first start.
import path from 'node:path'
import url from 'node:url'
import 'dotenv/config'
import { createPool } from './db.js'
import { createApp } from './app.js'
import { purgeOldViews, normalizeRetentionDays } from './features/statistics/statsRepo.js'

const pool = createPool()
// createApp serves the bundle and the SPA fallback itself, so a public page's
// HTML can carry its share-card meta tags (server/features/public-pages/metaTags.js).
const distDir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'dist')
const app = createApp(pool, { distDir })

// Statistics retention (PRIVACY.md): a rolling window per page — the plan's
// 30 or 90 days synced from GigBuddy, falling back to this default. Purged on
// boot and then daily.
const retentionDays = normalizeRetentionDays(process.env.STATS_RETENTION_DAYS)
async function purge() {
  try {
    const deleted = await purgeOldViews(pool, retentionDays)
    if (deleted > 0) console.log(`purged ${deleted} view events older than ${retentionDays} days`)
  } catch (err) {
    console.error('stats purge failed:', err.message)
  }
}
setInterval(purge, 24 * 60 * 60 * 1000).unref()

const port = Number(process.env.LINKPAGE_PORT) || 3010
app.listen(port, () => {
  console.log(`linkpage listening on :${port}`)
})

// After listen: a slow purge must not hold up readiness.
await purge()
