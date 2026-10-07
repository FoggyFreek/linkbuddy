// Share-card metadata for a public page. WhatsApp, X, iMessage, Discord and
// Signal fetch the HTML and never run the bundle, so the tags a shared link
// previews with have to be in the document the server sends — hence a resolved
// payload in, a <head> block out. All text here is band-supplied, so every
// value is HTML-escaped on the way into an attribute.

const MAX_DESCRIPTION = 200

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Crawlers only follow absolute http(s) image URLs; anything else (relative,
// data:, javascript:) is dropped rather than emitted as a broken card.
function absoluteHttpUrl(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function truncate(text, max = MAX_DESCRIPTION) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

function ogType(release) {
  if (!release) return 'profile'
  return release.kind === 'album' ? 'music.album' : 'music.song'
}

export function pageMetaFor(page, { pageUrl }) {
  const band = page?.band || null
  const release = page?.release || null
  if (!band && !release) return null

  const bandArtwork = absoluteHttpUrl(band?.bannerUrl) || absoluteHttpUrl(band?.avatarUrl)
  const artist = release?.artist || band?.name || null
  const title = release
    ? [release.title, artist].filter(Boolean).join(' — ')
    : band?.name || 'Band Links'

  let description
  if (release) {
    description = artist ? `Listen to ${release.title} by ${artist}.` : `Listen to ${release.title}.`
  } else {
    description = band?.bio ? truncate(band.bio) : `Links from ${band?.name}.`
  }

  const imageUrl = (release ? absoluteHttpUrl(release.coverUrl) : null) || bandArtwork

  return {
    title,
    description,
    imageUrl,
    imageAlt: release ? `${release.title} cover art` : `${band?.name || 'Band'} artwork`,
    url: pageUrl,
    type: ogType(release),
    siteName: band?.name || null,
    card: imageUrl ? 'summary_large_image' : 'summary',
  }
}

export function renderMetaTags(meta) {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
  ]
  if (meta.url) {
    tags.push(
      `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
      `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    )
  }
  if (meta.siteName) tags.push(`<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`)
  if (meta.imageUrl) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`,
    )
  }
  tags.push(
    `<meta name="twitter:card" content="${meta.card}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  )
  return tags.map((tag) => `    ${tag}`).join('\n')
}

// index.html ships a placeholder title and description; they are stripped
// rather than left in place, or a crawler reading the first match would get
// "Band Links" for every page.
const PLACEHOLDER_TITLE = /^[ \t]*<title>[^<]*<\/title>[ \t]*\r?\n/im
const PLACEHOLDER_DESCRIPTION = /^[ \t]*<meta\s+name=["']description["'][^>]*>[ \t]*\r?\n/im
const HEAD_CLOSE = /(?<![ \t])([ \t]*)<\/head>/

export function injectMetaTags(html, meta) {
  if (!meta || !html.includes('</head>')) return html
  return html
    .replace(PLACEHOLDER_TITLE, '')
    .replace(PLACEHOLDER_DESCRIPTION, '')
    // A replacer function, so `$` sequences in band text stay literal.
    .replace(HEAD_CLOSE, (_, indent) => `${renderMetaTags(meta)}\n${indent}</head>`)
}
