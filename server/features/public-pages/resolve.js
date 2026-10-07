// Resolves a stored layout against the synced content snapshot into the
// payload the public page renders. Widgets referencing content that has since
// disappeared (deleted song, archived product) are dropped silently — the
// public page must never break because gigbuddy content moved on.
import { detectPlatform } from './platforms.js'
import { detectEmbed } from './embeds.js'
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../../shared/features/appearance/pageBackgrounds.js'
import { PAGE_FONT_KEYS, DEFAULT_PAGE_FONT } from '../../../shared/features/appearance/pageFonts.js'
import { pageThemeForScheme } from '../../../shared/features/appearance/pageThemes.js'

// Snapshot URLs end up in hrefs and image sources, so only http(s) survives.
function httpUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

// A copy of `record` with each of `keys` it carries reduced to an http(s) URL.
function withHttpUrls(record, keys) {
  const copy = { ...record }
  for (const key of keys) {
    if (Object.hasOwn(copy, key)) copy[key] = httpUrl(copy[key])
  }
  return copy
}

function webLinks(song) {
  return (song?.links || []).filter((link) => httpUrl(link.url))
}

const MAX_TRACKS = 100
const MAX_TRACK_TITLE = 120

// The song or album a platforms widget or release page points at.
export function releaseSource(content, ref) {
  if (ref?.albumId) return (content.albums || []).find((a) => a.id === ref.albumId)
  return (content.songs || []).find((s) => s.id === ref?.songId)
}

// An album's tracklist as published: titled entries only, numbers positive or null.
function resolveTracks(tracks) {
  if (!Array.isArray(tracks)) return []
  return tracks
    .filter((track) => typeof track?.title === 'string' && track.title.trim())
    .slice(0, MAX_TRACKS)
    .map((track) => ({
      number: Number.isSafeInteger(track.number) && track.number > 0 ? track.number : null,
      title: track.title.slice(0, MAX_TRACK_TITLE),
    }))
}

function resolveMerch(widget, content) {
  const products = widget.items.flatMap((item) => {
    const product = (content.products || []).find((p) => p.id === item.productId)
    if (!product) return []
    return [{
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: item.imageUrl,
      badge: item.badge,
    }]
  })
  if (!products.length) return null
  return { id: widget.id, type: 'merch', title: widget.title, shopUrl: widget.shopUrl || null, products }
}

function resolveWidget(widget, content) {
  switch (widget.type) {
    case 'song': {
      const song = (content.songs || []).find((s) => s.id === widget.songId)
      const hidden = new Set(widget.hiddenLinks || [])
      const links = webLinks(song).filter((link) => !hidden.has(link.url.trim()))
      if (!links.length) return null
      return {
        id: widget.id,
        type: 'song',
        title: song.title,
        artist: song.artist,
        coverUrl: httpUrl(song.coverUrl),
        // Tag each link with its detected platform so the stack can render a
        // recognized platform's icon in place of a text pill (id 'other' when
        // the host matches no known platform).
        links: links.map((link) => ({ ...link, platform: detectPlatform(link.url, link.label) })),
      }
    }
    case 'platforms': {
      const links = webLinks(releaseSource(content, widget))
      if (!links.length) return null
      return {
        id: widget.id,
        type: 'platforms',
        title: widget.title,
        platforms: links.map((link) => {
          const platform = detectPlatform(link.url, link.label)
          return { ...platform, url: link.url, embed: detectEmbed(link.url) }
        }),
      }
    }
    case 'accolades': {
      const accolades = (content.accolades || []).map((accolade) => withHttpUrls(accolade, ['url', 'imageUrl']))
      if (!accolades.length) return null
      return { id: widget.id, type: 'accolades', title: widget.title || 'Accolades', accolades }
    }
    case 'discography': {
      const discography = (content.discography || []).map((album) =>
        withHttpUrls(album, ['coverUrl', 'coverHighResolutionUrl']),
      )
      if (!discography.length) return null
      return { id: widget.id, type: 'discography', title: widget.title || 'Discography', discography }
    }
    case 'gigs': {
      const gigs = (content.gigs || [])
        .slice(0, widget.limit || 10)
        .map((gig) => withHttpUrls(gig, ['eventUrl']))
      return {
        id: widget.id,
        type: 'gigs',
        title: widget.title || 'Upcoming Gigs',
        gigs,
      }
    }
    case 'merch':
      return resolveMerch(widget, content)
    case 'embed':
      // The player descriptor is derived from the stored URL here, server-side.
      return { ...widget, embed: detectEmbed(widget.url) }
    case 'link':
      return { ...widget, embed: detectEmbed(widget.url) }
    default:
      return null
  }
}

// A band may publish its booking details from GigBuddy's profile. The block a
// visitor sees is rebuilt here rather than passed through: `contactEnabled` is
// the band's explicit opt-in, and without it nothing booking-related — the fee
// indication included — leaves this server. The same holds when the opt-in is
// on but no contact survives normalization: there would be no way to act on it.
const BOOKING_REPERTOIRES = new Set(['covers', 'tribute', 'original'])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[\d+][\d\s()./-]*$/

// Over-length is rejected, not trimmed: a truncated contact still parses as one
// and would reach nobody.
function bookingText(value, max) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : null
}

function bookingMatch(value, max, pattern) {
  const text = bookingText(value, max)
  return text && pattern.test(text) ? text : null
}

function feeCents(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function resolveBooking(booking) {
  if (booking?.contactEnabled !== true) return null
  const email = bookingMatch(booking.email, 254, EMAIL_PATTERN)
  const phone = bookingMatch(booking.phone, 40, PHONE_PATTERN)
  if (!email && !phone) return null
  const currency = bookingMatch(booking.currency, 3, /^[a-z]{3}$/i)
  // A range filled in backwards is still one span of money.
  const fees = [feeCents(booking.feeLowCents), feeCents(booking.feeHighCents)]
  const [feeLowCents, feeHighCents] = fees.every((f) => f !== null) ? [...fees].sort((a, b) => a - b) : fees
  return {
    email,
    phone,
    feeLowCents,
    feeHighCents,
    currency: currency ? currency.toUpperCase() : 'EUR',
    repertoire: BOOKING_REPERTOIRES.has(booking.repertoire) ? booking.repertoire : null,
  }
}

function resolveBand(band) {
  if (!band) return null
  return {
    ...withHttpUrls(band, ['logoUrl', 'logoDarkUrl', 'avatarUrl', 'bannerUrl']),
    booking: resolveBooking(band.booking),
  }
}

// `release` is the stored {songId|albumId, title, artist} snapshot, null on the main page.
// Its full-bleed cover prefers the live high-resolution art; albums add their tracklist.
export function resolvePage(content, layout, release = null) {
  const sections = (layout?.sections || [])
    .map((section) => ({
      id: section.id,
      title: section.title,
      widgets: section.widgets.map((w) => resolveWidget(w, content)).filter(Boolean),
    }))
    .filter((section) => section.widgets.length > 0)
  let resolvedRelease = null
  if (release) {
    const source = releaseSource(content, release)
    resolvedRelease = {
      kind: release.albumId ? 'album' : 'song',
      title: release.title,
      artist: release.artist || content.band?.name || null,
      coverUrl: httpUrl(source?.coverHighResolutionUrl) || httpUrl(source?.coverUrl),
    }
    if (release.albumId) resolvedRelease.tracks = resolveTracks(source?.tracks)
  }
  const theme = normalizeTheme(layout?.theme, release ? 'dark' : 'light')
  return {
    band: resolveBand(content.band),
    release: resolvedRelease,
    background: normalizeBackground(layout?.background),
    font: normalizeFont(layout?.font),
    showBanner: layout?.showBanner === true,
    theme,
    themeVariant: pageThemeForScheme(layout?.themeVariant, theme),
    sections,
  }
}

// The stored backdrop key, re-checked at resolve time (layouts written before
// backgrounds existed have none) so the page always gets a key it can paint.
function normalizeBackground(background) {
  return PAGE_BACKGROUND_KEYS.includes(background) ? background : DEFAULT_PAGE_BACKGROUND
}

// The stored typeface key, re-checked at resolve time (layouts written before
// fonts existed have none) so the page always gets a face it can render — the
// same page kind on both sides, since a font is a plain per-page choice.
function normalizeFont(font) {
  return PAGE_FONT_KEYS.includes(font) ? font : DEFAULT_PAGE_FONT
}

// The page's colour scheme: the editor's explicit light/dark opt-in when it
// made one, otherwise `fallback` — dark for a release page's artwork-led
// layout, light for the main page — so the page never breaks on a missing or
// stale value.
function normalizeTheme(theme, fallback) {
  return theme === 'dark' || theme === 'light' ? theme : fallback
}
