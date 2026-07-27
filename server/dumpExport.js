// Debugging aid (`npm run export:dump -- <band-slug> [outfile]`): fetch a
// band's GigBuddy content export and print it, or write it to a file. No DB
// involved — this is the raw upstream payload, before layout resolution.
import fs from 'node:fs'
import 'dotenv/config'
import { fetchExport } from './gigbuddy.js'

const [slug, outFile] = process.argv.slice(2)
if (!slug) {
  console.error('usage: npm run export:dump -- <band-slug> [outfile.json]')
  process.exit(1)
}

// A release path ('band/release') has no export of its own; the band's main
// slug is the export key (see mainSlugOf in app.js).
const mainSlug = slug.split('/')[0]

try {
  const result = await fetchExport(mainSlug)
  if (result.notFound) {
    console.error(`GigBuddy has no export for "${mainSlug}" (404)`)
    process.exit(2)
  }
  const json = JSON.stringify(result.content, null, 2)
  if (outFile) {
    fs.writeFileSync(outFile, `${json}\n`)
    console.error(`wrote ${json.length} bytes to ${outFile}`)
  } else {
    console.log(json)
  }
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
