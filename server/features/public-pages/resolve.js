// Resolves a stored layout against the synced content snapshot into the
// payload the public page renders. Widgets referencing content that has since
// disappeared (deleted song, archived product) are dropped silently — the
// public page must never break because gigbuddy content moved on.
import { detectPlatform } from './platforms.js'
import { detectEmbed } from './embeds.js'
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../../shared/features/appearance/pageBackgrounds.js'
import { PAGE_FONT_KEYS, DEFAULT_PAGE_FONT } from '../../../shared/features/appearance/pageFonts.js'
import { pageThemeForScheme } from '../../../shared/features/appearance/pageThemes.js'

function resolveWidget(widget, content) {
  switch (widget.type) {
    case 'song': {
      const song = (content.songs || []).find((s) => s.id === widget.songId)
      if (!song?.links?.length) return null
      return {
        id: widget.id,
        type: 'song',
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        // Tag each link with its detected platform so the stack can render a
        // recognized platform's icon in place of a text pill (id 'other' when
        // the host matches no known platform).
        links: song.links.map((link) => ({ ...link, platform: detectPlatform(link.url, link.label) })),
      }
    }
    case 'platforms': {
      const song = (content.songs || []).find((s) => s.id === widget.songId)
      if (!song?.links?.length) return null
      return {
        id: widget.id,
        type: 'platforms',
        title: widget.title,
        platforms: song.links.map((link) => {
          const platform = detectPlatform(link.url, link.label)
          return { ...platform, url: link.url, embed: detectEmbed(link.url) }
        }),
      }
    }
    case 'accolades': {
      const accolades = content.accolades || []
      if (!accolades.length) return null
      return { id: widget.id, type: 'accolades', title: widget.title || 'Accolades', accolades }
    }
    case 'discography': {
      const discography = content.discography || []
      if (!discography.length) return null
      return { id: widget.id, type: 'discography', title: widget.title || 'Discography', discography }
    }
    case 'gigs': {
      const gigs = (content.gigs || []).slice(0, widget.limit || 10)
      return {
        id: widget.id,
        type: 'gigs',
        title: widget.title || 'Upcoming Gigs',
        gigs,
      }
    }
    case 'merch': {
      const products = []
      for (const item of widget.items) {
        const product = (content.products || []).find((p) => p.id === item.productId)
        if (!product) continue
        products.push({
          id: product.id,
          name: product.name,
          priceCents: product.priceCents,
          imageUrl: item.imageUrl,
          badge: item.badge,
        })
      }
      if (!products.length) return null
      return { id: widget.id, type: 'merch', title: widget.title, shopUrl: widget.shopUrl || null, products }
    }
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
const BOOKING_REPERTOIRES = ['covers', 'tribute', 'original']
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
  if (!booking || booking.contactEnabled !== true) return null
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
    repertoire: BOOKING_REPERTOIRES.includes(booking.repertoire) ? booking.repertoire : null,
  }
}

function resolveBand(band) {
  return band ? { ...band, booking: resolveBooking(band.booking) } : null
}

// `release` is the page's stored release snapshot ({songId, title, artist})
// for release landing pages; null for the main page. The cover comes from the
// live content snapshot when the song still exists (fresh signed image URL).
// A release page shows the art full-bleed, so it takes gigbuddy's
// high-resolution cover; song widgets elsewhere stay on the thumbnail-sized
// one. Songs exported without a high-resolution cover fall back to it.
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
    const song = (content.songs || []).find((s) => s.id === release.songId)
    resolvedRelease = {
      title: release.title,
      artist: release.artist || content.band?.name || null,
      coverUrl: song?.coverHighResolutionUrl || song?.coverUrl || null,
    }
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
