// Canonical list of icon keys a `link` widget may use. Single source of truth
// shared by the server (validation allow-list in server/layout.js) and the
// client (key → SVG component map in src/icons.jsx), so the two can never
// drift: a key the editor offers is always one the server accepts and the
// public page can render. Each key names a component in src/icons.jsx.
export const LINK_ICON_KEYS = [
  'globe',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'spotify',
  'calendar',
  'music',
  'shop',
]
