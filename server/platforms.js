// Streaming-platform detection from a link URL. Used to turn a song's links
// into "choose your platform" buttons on release landing pages, and to label
// click events for conversion statistics.
//
// The platform vocabulary (id + label + icon) lives in the shared registry so
// the server, the editor's statistics, and the button icons stay in sync; the
// host-matching predicates below are server-only and keyed to those ids.
import { PLATFORMS } from '../shared/platforms.js'

const MATCHERS = {
  spotify: (h) => h === 'open.spotify.com' || h === 'spotify.com',
  apple: (h) => h === 'music.apple.com' || h === 'itunes.apple.com' || h === 'geo.music.apple.com',
  'youtube-music': (h) => h === 'music.youtube.com',
  youtube: (h) => h === 'youtube.com' || h === 'youtu.be',
  deezer: (h) => h === 'deezer.com' || h === 'deezer.page.link',
  tidal: (h) => h === 'tidal.com' || h === 'listen.tidal.com',
  amazon: (h) => h === 'music.amazon.com' || (h.startsWith('music.amazon.') && h.split('.').length === 3) || h === 'amazon.com',
  soundcloud: (h) => h === 'soundcloud.com' || h === 'on.soundcloud.com',
  bandcamp: (h) => h === 'bandcamp.com' || h.endsWith('.bandcamp.com'),
}

const RULES = PLATFORMS.map((p) => ({ id: p.id, label: p.label, test: MATCHERS[p.id] }))

// Returns { id, label } — falls back to a generic entry using the link's own
// label (or hostname) so unknown platforms still get a button.
export function detectPlatform(url, linkLabel = null) {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return { id: 'other', label: linkLabel || 'Listen' }
  }
  for (const rule of RULES) {
    if (rule.test(host)) return { id: rule.id, label: rule.label }
  }
  return { id: 'other', label: linkLabel || host }
}

// Click targets are stored in statistics — keep them short, printable, and
// impossible to abuse as a free-text channel.
export function sanitizeClickTarget(raw) {
  if (typeof raw !== 'string') return null
  const target = raw.trim().toLowerCase().slice(0, 80)
  if (!target || !/^[\w :./+-]+$/.test(target)) return null
  return target
}
