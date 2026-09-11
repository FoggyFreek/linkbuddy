// Canonical list of page-theme keys a layout may select. A page picks a colour
// scheme (`layout.theme`: light/dark/auto) and, within it, one of three palettes
// — the scheme's own default plus two alternates. This is the single source of
// truth shared by the server (validation allow-list in
// server/features/editor/layout.js) and the client (key → palette map in
// src/lib/pageThemes.js), so the two can never drift.
//
// A key is `<scheme>` for the scheme's default palette and `<scheme>-<variant>`
// for an alternate, so a stored key always says which scheme it belongs to.
// Only one key is stored per page: flipping the page's scheme falls back to the
// other scheme's default (pageThemeForScheme) and flipping back restores the
// choice.
export const PAGE_THEME_KEYS = [
  'light',
  'light-sky',
  'light-sand',
  'dark',
  'dark-carbon',
  'dark-forest',
]

export const DEFAULT_PAGE_THEMES = { light: 'light', dark: 'dark' }

// The palette a page actually paints: the stored key when it belongs to the
// page's resolved colour scheme, otherwise that scheme's default. Used by the
// server at resolve time and by the editor for its own swatches, so a stale or
// mismatched key can never paint a dark palette onto a light page.
export function pageThemeForScheme(key, scheme) {
  const scheme_ = DEFAULT_PAGE_THEMES[scheme] ? scheme : 'light'
  return PAGE_THEME_KEYS.includes(key) && key.split('-')[0] === scheme_
    ? key
    : DEFAULT_PAGE_THEMES[scheme_]
}
