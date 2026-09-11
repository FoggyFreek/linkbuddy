import { describe, it, expect } from 'vitest'
import { pageMetaFor, renderMetaTags, injectMetaTags } from '../metaTags.js'

const BAND = { name: 'The Woods', bio: 'Folk noise from Utrecht.', bannerUrl: 'https://cdn.example/banner.jpg', avatarUrl: 'https://cdn.example/avatar.jpg' }

function bandPage(overrides = {}) {
  return { band: BAND, release: null, sections: [], ...overrides }
}

function releasePage(overrides = {}) {
  return {
    band: BAND,
    release: { title: 'Hollow Ground', artist: 'The Woods', coverUrl: 'https://cdn.example/cover.jpg' },
    sections: [],
    ...overrides,
  }
}

const URL_OPTS = { pageUrl: 'https://links.example/thewoods' }

describe('pageMetaFor', () => {
  it('describes a band page from the band profile', () => {
    const meta = pageMetaFor(bandPage(), URL_OPTS)
    expect(meta.title).toBe('The Woods')
    expect(meta.description).toBe('Folk noise from Utrecht.')
    expect(meta.imageUrl).toBe('https://cdn.example/banner.jpg')
    expect(meta.type).toBe('profile')
    expect(meta.url).toBe('https://links.example/thewoods')
  })

  it('describes a release page from the release, not the band', () => {
    const meta = pageMetaFor(releasePage(), { pageUrl: 'https://links.example/thewoods/hollow-ground' })
    expect(meta.title).toBe('Hollow Ground — The Woods')
    expect(meta.description).toBe('Listen to Hollow Ground by The Woods.')
    expect(meta.imageUrl).toBe('https://cdn.example/cover.jpg')
    expect(meta.type).toBe('music.song')
  })

  it('falls back to the band artwork when a release has no cover', () => {
    const meta = pageMetaFor(releasePage({ release: { title: 'Hollow Ground', artist: null, coverUrl: null } }), URL_OPTS)
    // resolvePage already backfills a missing artist from the band, and the
    // card follows: the band name still names the release.
    expect(meta.title).toBe('Hollow Ground — The Woods')
    expect(meta.imageUrl).toBe('https://cdn.example/banner.jpg')
  })

  it('names a release with no band context by title alone', () => {
    const meta = pageMetaFor({ band: null, release: { title: 'Hollow Ground', artist: null, coverUrl: null } }, URL_OPTS)
    expect(meta.title).toBe('Hollow Ground')
    expect(meta.description).toBe('Listen to Hollow Ground.')
    expect(meta.imageUrl).toBeNull()
  })

  it('falls back to the avatar when there is no banner', () => {
    const meta = pageMetaFor(bandPage({ band: { ...BAND, bannerUrl: null } }), URL_OPTS)
    expect(meta.imageUrl).toBe('https://cdn.example/avatar.jpg')
  })

  it('describes a band with no bio', () => {
    const meta = pageMetaFor(bandPage({ band: { ...BAND, bio: null } }), URL_OPTS)
    expect(meta.description).toBe('Links from The Woods.')
  })

  it('drops artwork that is not an absolute http(s) URL', () => {
    for (const bannerUrl of ['/relative/banner.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAA', '']) {
      const meta = pageMetaFor(bandPage({ band: { ...BAND, bannerUrl, avatarUrl: null } }), URL_OPTS)
      expect(meta.imageUrl).toBeNull()
    }
  })

  it('asks for a large card only when there is artwork', () => {
    expect(pageMetaFor(bandPage(), URL_OPTS).card).toBe('summary_large_image')
    expect(pageMetaFor(bandPage({ band: { name: 'The Woods' } }), URL_OPTS).card).toBe('summary')
  })

  it('truncates a long bio on a word boundary', () => {
    const bio = `${'word '.repeat(80)}end`
    const meta = pageMetaFor(bandPage({ band: { ...BAND, bio } }), URL_OPTS)
    expect(meta.description.length).toBeLessThanOrEqual(201)
    expect(meta.description.endsWith('…')).toBe(true)
    expect(meta.description).not.toMatch(/\s…$/)
  })

  it('returns null for a payload with neither band nor release', () => {
    expect(pageMetaFor({ band: null, release: null }, URL_OPTS)).toBeNull()
  })
})

describe('renderMetaTags', () => {
  it('emits the Open Graph and Twitter tags crawlers read', () => {
    const html = renderMetaTags(pageMetaFor(releasePage(), URL_OPTS))
    expect(html).toContain('<title>Hollow Ground — The Woods</title>')
    expect(html).toContain('<meta name="description" content="Listen to Hollow Ground by The Woods." />')
    expect(html).toContain('<meta property="og:title" content="Hollow Ground — The Woods" />')
    expect(html).toContain('<meta property="og:type" content="music.song" />')
    expect(html).toContain('<meta property="og:url" content="https://links.example/thewoods" />')
    expect(html).toContain('<meta property="og:image" content="https://cdn.example/cover.jpg" />')
    expect(html).toContain('<meta property="og:site_name" content="The Woods" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('<link rel="canonical" href="https://links.example/thewoods" />')
  })

  it('omits the image tags when there is no artwork', () => {
    const html = renderMetaTags(pageMetaFor(bandPage({ band: { name: 'The Woods' } }), URL_OPTS))
    expect(html).not.toContain('og:image')
    expect(html).toContain('<meta name="twitter:card" content="summary" />')
  })

  it('escapes band-supplied text so it cannot break out of an attribute', () => {
    const meta = pageMetaFor(bandPage({ band: { name: '"><script>alert(1)</script>', bio: "Mac & Cheese's <b>best</b>" } }), URL_OPTS)
    const html = renderMetaTags(meta)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
    expect(html).toContain('Mac &amp; Cheese&#39;s &lt;b&gt;best&lt;/b&gt;')
  })
})

describe('injectMetaTags', () => {
  const TEMPLATE = [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="description" content="Band link page" />',
    '    <title>Band Links</title>',
    '  </head>',
    '  <body><div id="root"></div></body>',
    '</html>',
  ].join('\n')

  it('replaces the placeholder title and description rather than duplicating them', () => {
    const html = injectMetaTags(TEMPLATE, pageMetaFor(bandPage(), URL_OPTS))
    expect(html).not.toContain('Band Links')
    expect(html).not.toContain('Band link page')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
    expect(html).toContain('<title>The Woods</title>')
  })

  it('keeps the rest of the document intact', () => {
    const html = injectMetaTags(TEMPLATE, pageMetaFor(bandPage(), URL_OPTS))
    expect(html).toContain('<meta charset="UTF-8" />')
    expect(html).toContain('<div id="root"></div>')
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'))
  })

  it('returns the document unchanged when it has no head to inject into', () => {
    expect(injectMetaTags('<p>no head</p>', pageMetaFor(bandPage(), URL_OPTS))).toBe('<p>no head</p>')
  })
})
