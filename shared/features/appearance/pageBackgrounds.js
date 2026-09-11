// Canonical list of page-background keys a layout may select. Single source of
// truth shared by the server (validation allow-list in server/features/editor/layout.js) and the
// client (key → SVG artwork map in src/pageBackgrounds.js), so the two can never
// drift: a background the editor offers is always one the server stores and the
// public page can paint. `none` is the default — the plain themed canvas.
//
// A `<scene>-<colourway>` key is an alternate palette of the scene before it.
// It is a background key like any other here; the editor just offers it on the
// scene's own swatch rather than as a separate one.
export const PAGE_BACKGROUND_KEYS = [
  'none',
  'glow',
  'glow-citrus',
  'glow-mist',
  'gradient-lines',
  'sand',
  'sand-slate',
  'sand-rose',
  'ribbons',
  'orbit',
  'mosaic',
  'sunburst',
  'sunburst-ember',
  'sunburst-lagoon',
  'bloom',
  'rainbow',
  'rainbow-aurora',
  'rainbow-ash',
  'blobs',
  'confetti',
  'fluid',
  'squares',
  'hexagons',
  'topography',
]

export const DEFAULT_PAGE_BACKGROUND = 'none'
