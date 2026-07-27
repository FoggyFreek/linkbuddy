// Canonical list of page-background keys a layout may select. Single source of
// truth shared by the server (validation allow-list in server/layout.js) and the
// client (key → SVG artwork map in src/pageBackgrounds.js), so the two can never
// drift: a background the editor offers is always one the server stores and the
// public page can paint. `none` is the default — the plain themed canvas.
export const PAGE_BACKGROUND_KEYS = [
  'none',
  'glow',
  'gradient-lines',
  'sand',
  'ribbons',
  'orbit',
  'mosaic',
  'bloom',
  'blobs',
  'confetti',
]

export const DEFAULT_PAGE_BACKGROUND = 'none'
