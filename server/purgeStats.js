// One-shot retention purge (`npm run stats:purge`) for deployments that
// prefer an external scheduler over the in-process daily purge.
import 'dotenv/config'
import { createPool } from './db.js'
import { purgeOldViews, normalizeRetentionDays } from './statsRepo.js'

const pool = createPool()
const retentionDays = normalizeRetentionDays(process.env.STATS_RETENTION_DAYS)

try {
  const deleted = await purgeOldViews(pool, retentionDays)
  console.log(`purged ${deleted} view events older than ${retentionDays} days`)
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  await pool.end()
}
