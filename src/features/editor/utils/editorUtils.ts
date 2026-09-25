// Small pure helpers shared across the editor UI. No React, no I/O.
import { trim } from '../../../utils/trimChars.js'
import type { DropTarget } from './dropTarget.js'
import type { ApiError, ContentSnapshot, DragLocation, DraftSection, EditorPage, Layout, PageListEntry, PageTheme, SaveState } from '../../../types.js'

// Immutably move list[index] by `delta` positions; returns the list unchanged
// when the move would fall off either end.
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

// Immutably move one widget within, or across, sections. `from`/`to` are
// `{ sectionId, index }`; `to.index` is the slot the widget occupies once it has
// been lifted out of its source, so dropping onto a row puts it in that row's
// place. Out-of-range targets clamp, and an unknown source or section is a no-op.
export function moveWidget(sections: DraftSection[], from: DragLocation, to: DragLocation): DraftSection[] {
  const widget = sections.find((s) => s.id === from.sectionId)?.widgets[from.index]
  if (!widget) return sections
  if (!sections.some((s) => s.id === to.sectionId)) return sections
  if (from.sectionId === to.sectionId && from.index === to.index) return sections

  return sections.map((section) => {
    if (section.id !== from.sectionId && section.id !== to.sectionId) return section
    let widgets = section.id === from.sectionId
      ? section.widgets.filter((_, i) => i !== from.index)
      : section.widgets
    if (section.id === to.sectionId) {
      const at = Math.max(0, Math.min(to.index, widgets.length))
      widgets = [...widgets.slice(0, at), widget, ...widgets.slice(at)]
    }
    return { ...section, widgets }
  })
}

// Apply a drag drop to a flat list. An insert `index` counts gaps in the list as
// it was before the item was lifted out.
export function dropItem<T>(list: T[], from: number, target: Pick<DropTarget, 'mode' | 'index'>): T[] {
  if (target.mode === 'swap') {
    if (target.index === from || !(target.index in list)) return list
    const next = [...list]
    next[from] = list[target.index]
    next[target.index] = list[from]
    return next
  }
  const to = target.index > from ? target.index - 1 : target.index
  return to === from ? list : moveItem(list, from, to - from)
}

// Apply a drag drop to a widget, within or across sections.
export function dropWidget(sections: DraftSection[], from: DragLocation, target: DropTarget): DraftSection[] {
  if (target.mode === 'insert') {
    const index = target.list === from.sectionId && target.index > from.index ? target.index - 1 : target.index
    return moveWidget(sections, from, { sectionId: target.list, index })
  }
  const a = sections.find((s) => s.id === from.sectionId)?.widgets[from.index]
  const b = sections.find((s) => s.id === target.list)?.widgets[target.index]
  if (!a || !b || a === b) return sections
  return sections.map((section) => {
    if (section.id !== from.sectionId && section.id !== target.list) return section
    const widgets = section.widgets.map((w) => (w === a ? b : w === b ? a : w))
    return { ...section, widgets }
  })
}

// Turn free text into a URL-safe release slug tail (lowercase, ASCII, dashes),
// matching the server's RELEASE_TAIL length cap.
export function slugify(value: string): string {
  const dashed = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
  return trim(dashed, '-').slice(0, 60)
}

// A failed editor write is either an expired session (needs re-auth) or a
// transient error the autosave will retry. One place decides which.
export function saveErrorState(err: unknown): SaveState {
  return (err as ApiError | null)?.status === 401 ? 'expired' : 'error'
}

// The visitor-facing label for a page: the band name for the main link page,
// the release title otherwise, each falling back to the slug. Shared by the
// header, the page switcher, and the share sheet so they can't disagree.
export function pageLabel(page: PageListEntry, content: ContentSnapshot): string {
  return page.pageType === 'main'
    ? content.band?.name || page.slug
    : page.release?.title || page.slug
}

// The colour scheme this page's content will be rendered in — what the public
// page and the Preview tab force via ColorSchemeScope. Mirrors the server's
// `normalizeTheme` (server/features/public-pages/resolve.js): the draft layout's explicit opt-in
// when it made one, otherwise dark for a release page's artwork-led layout and
// light for the main page. Used by editor chrome that has to show page-scheme
// artwork (the background swatches) before a preview has been loaded.
export function pageSchemeMode(page: PageListEntry, layout: Layout | null): PageTheme {
  if (layout?.theme === 'dark' || layout?.theme === 'light') return layout.theme
  return page.pageType === 'release' ? 'dark' : 'light'
}

// The compact page-switcher shape the server returns from list endpoints.
// Kept here so client-side inserts (a freshly created release) match what a
// reload from the server would produce.
export function toListEntry(page: EditorPage): PageListEntry {
  return {
    id: page.id,
    slug: page.slug,
    pageType: page.pageType,
    release: page.release,
    publishedAt: page.publishedAt,
  }
}
