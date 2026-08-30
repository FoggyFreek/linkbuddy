// Debugging aid (`npm run export:dump -- <band-slug> [outfile]`): fetch a
// band's GigBuddy content export and print it, or write it to a file. No DB
// involved — this is the raw upstream payload, before layout resolution.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import 'dotenv/config'
import { fetchExport } from './gigbuddy.js'

export async function runDumpExport([slug, outFile], dependencies = {}) {
  const pullExport = dependencies.fetchExport || fetchExport
  const writeFile = dependencies.writeFile || fs.writeFileSync
  const log = dependencies.log || console.log
  const report = dependencies.error || console.error

  if (!slug) {
    report('usage: npm run export:dump -- <band-slug> [outfile.json]')
    return 1
  }

  // A release path ('band/release') has no export of its own; the band's main
  // slug is the export key (see mainSlugOf in app.js).
  const mainSlug = slug.split('/')[0]

  try {
    const result = await pullExport(mainSlug)
    if (result.notFound) {
      report(`GigBuddy has no export for "${mainSlug}" (404)`)
      return 2
    }
    const json = JSON.stringify(result.content, null, 2)
    if (outFile) {
      writeFile(outFile, `${json}\n`)
      report(`wrote ${json.length} bytes to ${outFile}`)
    } else {
      log(json)
    }
    return 0
  } catch (err) {
    report(err.message)
    return 1
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await runDumpExport(process.argv.slice(2))
}
