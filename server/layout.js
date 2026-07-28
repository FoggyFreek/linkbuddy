// Validation + normalization of editor-submitted layouts. A layout is a stack
// of sections, each holding an ordered list of widgets that reference synced
// content by id (songs, products) or carry their own data (links).
//
// Everything client-submitted is whitelisted field-by-field: unknown widget
// types are rejected, unknown fields dropped, strings capped, and URLs
// restricted to http(s).
import crypto from 'node:crypto'
import { LINK_ICON_KEYS } from '../shared/linkIcons.js'
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../shared/pageBackgrounds.js'

const MAX_SECTIONS = 20
const MAX_WIDGETS_PER_SECTION = 30
const MAX_MERCH_ITEMS = 50
const MAX_TITLE = 120
const MAX_LABEL = 160
const MAX_URL = 2000

export const LINK_ICONS = new Set(LINK_ICON_KEYS)
export const PAGE_BACKGROUNDS = new Set(PAGE_BACKGROUND_KEYS)

function fail(message) {
  return { error: message }
}

function cleanString(value, max) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function sanitizeUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_URL) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

function widgetId(raw) {
  return typeof raw === 'string' && /^[\w-]{1,40}$/.test(raw) ? raw : crypto.randomUUID()
}

function positiveId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function optionalUrl(value) {
  return value ? sanitizeUrl(value) : null
}

function parseSong(raw, id) {
  const songId = positiveId(raw.songId)
  if (!songId) return fail('Song widget needs a songId')
  return { widget: { id, type: 'song', songId } }
}

// One button per streaming platform for a song's links — the core widget of a
// release landing page, but usable on any page.
function parsePlatforms(raw, id) {
  const songId = positiveId(raw.songId)
  if (!songId) return fail('Platforms widget needs a songId')
  return { widget: { id, type: 'platforms', songId, title: cleanString(raw.title, MAX_TITLE) } }
}

function parseGigs(raw, id) {
  const limit = positiveId(raw.limit)
  return {
    widget: {
      id,
      type: 'gigs',
      title: cleanString(raw.title, MAX_TITLE),
      limit: limit ? Math.min(limit, 50) : 10,
    },
  }
}

function parseMerch(raw, id) {
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return fail('Merch widget needs at least one item')
  }
  if (raw.items.length > MAX_MERCH_ITEMS) return fail('Too many merch items')
  const items = []
  for (const item of raw.items) {
    const productId = positiveId(item?.productId)
    if (!productId) return fail('Merch item needs a productId')
    items.push({
      productId,
      imageUrl: optionalUrl(item.imageUrl),
      badge: cleanString(item.badge, 20),
    })
  }
  // Products carry no URL of their own in gigbuddy; an optional widget-level
  // shop URL (e.g. the band's Shopify store) makes the cards clickable.
  return {
    widget: {
      id,
      type: 'merch',
      title: cleanString(raw.title, MAX_TITLE),
      shopUrl: optionalUrl(raw.shopUrl),
      items,
    },
  }
}

// Rich embed card for a pasted URL: metadata (title/image/description) is
// snapshotted from the editor's unfurl; the player descriptor itself is
// recomputed server-side at resolve time — never stored from the client.
function parseEmbed(raw, id) {
  const url = sanitizeUrl(raw.url)
  if (!url) return fail('Embed widget needs a valid http(s) URL')
  return {
    widget: {
      id,
      type: 'embed',
      url,
      title: cleanString(raw.title, MAX_LABEL),
      description: cleanString(raw.description, 300),
      imageUrl: optionalUrl(raw.imageUrl),
    },
  }
}

function parseLink(raw, id) {
  const label = cleanString(raw.label, MAX_LABEL)
  const url = sanitizeUrl(raw.url)
  if (!label) return fail('Link widget needs a label')
  if (!url) return fail('Link widget needs a valid http(s) URL')
  return {
    widget: {
      id,
      type: 'link',
      label,
      sublabel: cleanString(raw.sublabel, MAX_LABEL),
      url,
      icon: LINK_ICONS.has(raw.icon) ? raw.icon : 'globe',
      imageUrl: optionalUrl(raw.imageUrl),
    },
  }
}

// The closed set of widget types. A type absent from this map is rejected —
// this is the whitelist the public payload's shape rests on.
const WIDGET_PARSERS = {
  song: parseSong,
  platforms: parsePlatforms,
  gigs: parseGigs,
  merch: parseMerch,
  embed: parseEmbed,
  link: parseLink,
}

function parseWidget(raw) {
  if (!raw || typeof raw !== 'object') return fail('Invalid widget')
  const parser = Object.hasOwn(WIDGET_PARSERS, raw.type) ? WIDGET_PARSERS[raw.type] : null
  if (!parser) return fail('Unknown widget type')
  return parser(raw, widgetId(raw.id))
}

// Returns { layout } (normalized, safe to store) or { error }.
export function validateLayout(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sections)) {
    return fail('Layout must have a sections array')
  }
  if (raw.sections.length > MAX_SECTIONS) return fail('Too many sections')
  const sections = []
  for (const rawSection of raw.sections) {
    if (!rawSection || typeof rawSection !== 'object' || !Array.isArray(rawSection.widgets)) {
      return fail('Invalid section')
    }
    if (rawSection.widgets.length > MAX_WIDGETS_PER_SECTION) return fail('Too many widgets in a section')
    const widgets = []
    for (const rawWidget of rawSection.widgets) {
      const parsed = parseWidget(rawWidget)
      if (parsed.error) return parsed
      widgets.push(parsed.widget)
    }
    sections.push({ id: widgetId(rawSection.id), title: cleanString(rawSection.title, MAX_TITLE), widgets })
  }
  return {
    layout: {
      background: parseBackground(raw.background),
      showBanner: raw.showBanner === true,
      theme: parseTheme(raw.theme),
      sections,
    },
  }
}

// The page's chosen backdrop artwork (see src/pageBackgrounds.js). Like the link
// icons this is a closed key set, not free-form styling — an unknown or missing
// value falls back to the plain themed canvas rather than failing the save, so a
// layout written by an older/newer editor still stores.
function parseBackground(raw) {
  return PAGE_BACKGROUNDS.has(raw) ? raw : DEFAULT_PAGE_BACKGROUND
}

// The page's colour-scheme override: an explicit 'light'/'dark' opt-in, or
// `null` for "auto" (resolve.js then falls back to dark for a release page,
// light for the main page). Anything else collapses to `null` rather than
// failing the save.
function parseTheme(raw) {
  return raw === 'light' || raw === 'dark' ? raw : null
}
