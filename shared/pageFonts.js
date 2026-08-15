// Canonical list of page-font keys a layout may select. Single source of truth
// shared by the server (validation allow-list in server/layout.js) and the
// client (key → font stack + @font-face map in src/lib/pageFonts.js), so the two
// can never drift: a font the editor offers is always one the server stores and
// the public page can render. `system` is the default — the theme's own stack,
// which loads nothing.
export const PAGE_FONT_KEYS = [
  'system',
  'inter',
  'manrope',
  'montserrat',
  'oswald',
  'bebas',
  'anton',
  'lora',
  'playfair',
  'space-grotesk',
  'marker',
]

export const DEFAULT_PAGE_FONT = 'system'
