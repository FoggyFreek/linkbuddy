// Canonical registry of the streaming platforms the app recognizes. This is
// the SINGLE source of truth for a platform's id, its human label, and which
// icon represents it — shared by the server (link detection + click-event
// labeling, server/platforms.js) and the client (statistics labels in
// StatsPanel, button icons in icons.jsx). Adding a platform is a one-line
// edit here; host matching stays server-side in server/platforms.js.
//
// `iconKey` names a component in src/icons.jsx (several platforms share one,
// e.g. YouTube Music reuses the YouTube icon).
export const PLATFORMS = [
  { id: 'spotify', label: 'Spotify', iconKey: 'spotify' },
  { id: 'apple', label: 'Apple Music', iconKey: 'apple' },
  { id: 'youtube-music', label: 'YouTube Music', iconKey: 'youtube' },
  { id: 'youtube', label: 'YouTube', iconKey: 'youtube' },
  { id: 'deezer', label: 'Deezer', iconKey: 'deezer' },
  { id: 'tidal', label: 'TIDAL', iconKey: 'tidal' },
  { id: 'amazon', label: 'Amazon Music', iconKey: 'music' },
  { id: 'soundcloud', label: 'SoundCloud', iconKey: 'soundcloud' },
  { id: 'bandcamp', label: 'Bandcamp', iconKey: 'bandcamp' },
]

// id → label, for consumers that only need the display name. The generic
// 'other' fallback is intentionally not listed: the server labels it from the
// link's own text/host, while the editor's statistics call it 'Other'.
export const PLATFORM_LABELS = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.label]))
