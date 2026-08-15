import { describe, it, expect } from 'vitest'
import { validateLayout, sanitizeUrl } from '../server/layout.js'

const song = (songId) => ({ type: 'song', songId })

describe('sanitizeUrl', () => {
  it('accepts http(s) and rejects other schemes', () => {
    expect(sanitizeUrl('https://example.com/x')).toBe('https://example.com/x')
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('data:text/html,hi')).toBeNull()
    expect(sanitizeUrl('not a url')).toBeNull()
  })
})

describe('validateLayout', () => {
  it('normalizes a full valid layout and assigns ids', () => {
    const result = validateLayout({
      sections: [
        {
          title: '  Listen to our music  ',
          widgets: [
            song(3),
            { type: 'gigs', title: 'Upcoming Gigs', limit: 5 },
            {
              type: 'merch',
              title: 'CDs',
              shopUrl: 'https://shop.example.com',
              items: [{ productId: 9, imageUrl: 'https://cdn.example.com/a.jpg', badge: 'NEW' }],
            },
            { type: 'link', label: 'Our website', url: 'https://band.example.com', icon: 'globe' },
          ],
        },
      ],
    })
    expect(result.error).toBeUndefined()
    const [section] = result.layout.sections
    expect(section.title).toBe('Listen to our music')
    expect(section.id).toBeTruthy()
    expect(section.widgets).toHaveLength(4)
    expect(section.widgets[0]).toMatchObject({ type: 'song', songId: 3 })
    expect(section.widgets[2].shopUrl).toBe('https://shop.example.com/')
    expect(section.widgets[3].icon).toBe('globe')
    for (const widget of section.widgets) expect(widget.id).toBeTruthy()
  })

  it('accepts platforms widgets and requires their songId', () => {
    const ok = validateLayout({ sections: [{ widgets: [{ type: 'platforms', songId: 4, title: 'Listen' }] }] })
    expect(ok.layout.sections[0].widgets[0]).toMatchObject({ type: 'platforms', songId: 4, title: 'Listen' })
    expect(validateLayout({ sections: [{ widgets: [{ type: 'platforms' }] }] }).error).toBeTruthy()
  })

  it('accepts embed widgets and requires a safe url', () => {
    const ok = validateLayout({
      sections: [{ widgets: [{ type: 'embed', url: 'https://open.spotify.com/track/x', title: 'Single', imageUrl: 'https://cdn.example.com/a.jpg' }] }],
    })
    expect(ok.layout.sections[0].widgets[0]).toMatchObject({ type: 'embed', title: 'Single' })
    // The embed descriptor is never stored — resolve derives it from the url.
    expect(ok.layout.sections[0].widgets[0].embed).toBeUndefined()
    expect(validateLayout({ sections: [{ widgets: [{ type: 'embed', url: 'javascript:x' }] }] }).error).toBeTruthy()
  })

  it('rejects unknown widget types and malformed shapes', () => {
    expect(validateLayout(null).error).toBeTruthy()
    expect(validateLayout({}).error).toBeTruthy()
    expect(validateLayout({ sections: [{ widgets: [{ type: 'iframe', url: 'https://x' }] }] }).error).toBeTruthy()
    expect(validateLayout({ sections: [{ widgets: [song(0)] }] }).error).toBeTruthy()
  })

  it('validates merch items and drops unsafe item urls', () => {
    expect(validateLayout({ sections: [{ widgets: [{ type: 'merch', items: [] }] }] }).error).toMatch(/at least one/)
    expect(
      validateLayout({ sections: [{ widgets: [{ type: 'merch', items: [{ productId: 0 }] }] }] }).error,
    ).toMatch(/productId/)
    expect(
      validateLayout({
        sections: [{ widgets: [{ type: 'merch', items: Array.from({ length: 51 }, () => ({ productId: 1 })) }] }],
      }).error,
    ).toMatch(/Too many merch/)

    const item = validateLayout({
      sections: [{ widgets: [{ type: 'merch', shopUrl: 'javascript:x', items: [{ productId: 9, imageUrl: 'javascript:x', badge: '  SALE  ' }] }] }],
    }).layout.sections[0].widgets[0]
    expect(item.shopUrl).toBeNull()
    expect(item.items[0].imageUrl).toBeNull()
    expect(item.items[0].badge).toBe('SALE')
  })

  it('caps widgets per section', () => {
    const widgets = Array.from({ length: 31 }, () => song(1))
    expect(validateLayout({ sections: [{ widgets }] }).error).toMatch(/Too many widgets/)
  })

  it('keeps a well-formed client id but replaces a malformed one', () => {
    const kept = validateLayout({ sections: [{ widgets: [{ ...song(1), id: 'widget-1' }] }] })
    expect(kept.layout.sections[0].widgets[0].id).toBe('widget-1')

    const replaced = validateLayout({ sections: [{ widgets: [{ ...song(1), id: 'no spaces allowed' }] }] })
    expect(replaced.layout.sections[0].widgets[0].id).not.toBe('no spaces allowed')
    expect(replaced.layout.sections[0].widgets[0].id).toBeTruthy()
  })

  it('rejects sections that are not objects with a widgets array', () => {
    expect(validateLayout({ sections: [null] }).error).toMatch(/Invalid section/)
    expect(validateLayout({ sections: [{}] }).error).toMatch(/Invalid section/)
    expect(validateLayout({ sections: [{ widgets: [null] }] }).error).toMatch(/Invalid widget/)
  })

  it('rejects a widget type inherited from Object.prototype', () => {
    // The parser table is a plain object; 'constructor' must not resolve on it.
    expect(validateLayout({ sections: [{ widgets: [{ type: 'constructor' }] }] }).error).toMatch(/Unknown widget/)
    expect(validateLayout({ sections: [{ widgets: [{ type: 'toString' }] }] }).error).toMatch(/Unknown widget/)
  })

  it('rejects link widgets with unsafe urls', () => {
    const result = validateLayout({
      sections: [{ widgets: [{ type: 'link', label: 'x', url: 'javascript:alert(1)' }] }],
    })
    expect(result.error).toMatch(/valid http/)
  })

  it('drops unknown fields instead of storing them', () => {
    const result = validateLayout({
      sections: [{ widgets: [{ ...song(1), onclick: 'evil()' }], evil: true }],
    })
    expect(result.layout.sections[0].widgets[0].onclick).toBeUndefined()
    expect(result.layout.sections[0].evil).toBeUndefined()
  })

  it('enforces collection caps', () => {
    const sections = Array.from({ length: 21 }, () => ({ widgets: [] }))
    expect(validateLayout({ sections }).error).toMatch(/Too many sections/)
  })

  it('keeps a known page background and falls back to none otherwise', () => {
    expect(validateLayout({ background: 'glow', sections: [] }).layout.background).toBe('glow')
    expect(validateLayout({ background: 'gradient-lines', sections: [] }).layout.background).toBe('gradient-lines')
    expect(validateLayout({ background: 'sand', sections: [] }).layout.background).toBe('sand')
    expect(validateLayout({ background: 'ribbons', sections: [] }).layout.background).toBe('ribbons')
    expect(validateLayout({ background: 'orbit', sections: [] }).layout.background).toBe('orbit')
    expect(validateLayout({ background: 'mosaic', sections: [] }).layout.background).toBe('mosaic')
    expect(validateLayout({ background: 'bloom', sections: [] }).layout.background).toBe('bloom')
    expect(validateLayout({ background: 'blobs', sections: [] }).layout.background).toBe('blobs')
    expect(validateLayout({ background: 'confetti', sections: [] }).layout.background).toBe('confetti')
    expect(validateLayout({ background: 'url(evil.svg)', sections: [] }).layout.background).toBe('none')
    expect(validateLayout({ sections: [] }).layout.background).toBe('none')
  })

  it('normalizes showBanner to a strict boolean, defaulting to false', () => {
    expect(validateLayout({ showBanner: true, sections: [] }).layout.showBanner).toBe(true)
    expect(validateLayout({ showBanner: false, sections: [] }).layout.showBanner).toBe(false)
    expect(validateLayout({ showBanner: 'yes', sections: [] }).layout.showBanner).toBe(false)
    expect(validateLayout({ sections: [] }).layout.showBanner).toBe(false)
  })

  it('keeps an explicit light/dark theme opt-in and defaults everything else to null (auto)', () => {
    expect(validateLayout({ theme: 'light', sections: [] }).layout.theme).toBe('light')
    expect(validateLayout({ theme: 'dark', sections: [] }).layout.theme).toBe('dark')
    expect(validateLayout({ theme: 'neon', sections: [] }).layout.theme).toBeNull()
    expect(validateLayout({ sections: [] }).layout.theme).toBeNull()
  })

  it('keeps a known page font and falls back to system otherwise', () => {
    expect(validateLayout({ font: 'bebas', sections: [] }).layout.font).toBe('bebas')
    expect(validateLayout({ font: 'space-grotesk', sections: [] }).layout.font).toBe('space-grotesk')
    expect(validateLayout({ font: 'system', sections: [] }).layout.font).toBe('system')
    expect(validateLayout({ font: 'comic sans', sections: [] }).layout.font).toBe('system')
    expect(validateLayout({ font: 'url(evil.woff2)', sections: [] }).layout.font).toBe('system')
    expect(validateLayout({ font: { toString: () => 'inter' }, sections: [] }).layout.font).toBe('system')
    expect(validateLayout({ sections: [] }).layout.font).toBe('system')
  })

  it('coerces gig limits into range and defaults bad icons', () => {
    const result = validateLayout({
      sections: [
        {
          widgets: [
            { type: 'gigs', limit: 9999 },
            { type: 'link', label: 'x', url: 'https://x.example', icon: 'marquee' },
          ],
        },
      ],
    })
    expect(result.layout.sections[0].widgets[0].limit).toBe(50)
    expect(result.layout.sections[0].widgets[1].icon).toBe('globe')
  })
})
