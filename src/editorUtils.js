// Small pure helpers shared across the editor UI. No React, no I/O.

// Immutably move list[index] by `delta` positions; returns the list unchanged
// when the move would fall off either end.
export function moveItem(list, index, delta) {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

// Turn free text into a URL-safe release slug tail (lowercase, ASCII, dashes),
// matching the server's RELEASE_TAIL length cap.
export function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// A failed editor write is either an expired session (needs re-auth) or a
// transient error the autosave will retry. One place decides which.
export function saveErrorState(err) {
  return err?.status === 401 ? 'expired' : 'error'
}

// The visitor-facing label for a page: the band name for the main link page,
// the release title otherwise, each falling back to the slug. Shared by the
// header, the page switcher, and the share sheet so they can't disagree.
export function pageLabel(page, content) {
  return page.pageType === 'main'
    ? content.band?.name || page.slug
    : page.release?.title || page.slug
}

// The compact page-switcher shape the server returns from list endpoints.
// Kept here so client-side inserts (a freshly created release) match what a
// reload from the server would produce.
export function toListEntry(page) {
  return {
    id: page.id,
    slug: page.slug,
    pageType: page.pageType,
    release: page.release,
    publishedAt: page.publishedAt,
  }
}
