// Parse a public URL path into a page slug, or null when it isn't a valid page
// path. One segment is a main page (/foo); two are a release page (/foo/bar).
// decodeURIComponent throws a URIError on malformed percent-encoding (e.g.
// /%E0%A4%A), so decoding is guarded — a bad path resolves to null (not-found)
// instead of crashing the render.
import { trim } from './trimChars.js'

// `{ slug, isRelease }`, or null. The segment count is the routing signal: the
// release slug namespace is `<mainSlug>/<tail>` and a main slug can never
// contain '/' (see server/migrations/003_release_slug_paths.sql), so two
// segments always address a release page.
export function parsePagePath(pathname) {
  const rest = trim(pathname, '/')
  if (!rest) return null
  const segments = rest.split('/')
  if (segments.length > 2) return null
  try {
    return { slug: segments.map(decodeURIComponent).join('/').toLowerCase(), isRelease: segments.length === 2 }
  } catch {
    return null
  }
}

export function slugFromPath(pathname) {
  return parsePagePath(pathname)?.slug ?? null
}
