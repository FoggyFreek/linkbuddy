// Public path rules shared by routing, namespace migration, and editor handoff.
export const MAIN_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/
export const RELEASE_TAIL_RE = /^[a-z0-9][a-z0-9-]{0,60}$/

export function slugFromSegments(segments) {
  const parts = (Array.isArray(segments) ? segments : [segments])
    .filter((segment) => typeof segment === 'string' && segment.length > 0)
    .map((segment) => segment.toLowerCase())
  if (parts.length === 1 && MAIN_SLUG_RE.test(parts[0])) return parts[0]
  if (parts.length === 2 && MAIN_SLUG_RE.test(parts[0]) && RELEASE_TAIL_RE.test(parts[1])) {
    return `${parts[0]}/${parts[1]}`
  }
  return null
}

export function releaseTail(slug) {
  if (typeof slug !== 'string') return null
  const parts = slug.split('/')
  if (parts.length !== 2 || !MAIN_SLUG_RE.test(parts[0]) || !RELEASE_TAIL_RE.test(parts[1])) {
    return null
  }
  return parts[1]
}

export function mainSlugOf(page) {
  return page.page_type === 'main' ? page.slug : page.slug.split('/')[0]
}
