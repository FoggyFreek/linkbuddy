import { describe, it, expect } from 'vitest'
import { resolvePage } from '../resolve.js'

const content = {
  band: { slug: 'woods', name: 'The Woods', socials: {} },
  songs: [
    {
      id: 1,
      title: 'Good To See You',
      artist: null,
      coverUrl: 'https://gb.example/img?t=abc',
      coverHighResolutionUrl: 'https://gb.example/img?t=abc-hi',
      links: [
        { label: 'Spotify', url: 'https://open.spotify.com/track/x' },
        { label: null, url: 'https://music.apple.com/album/x' },
      ],
    },
    { id: 2, title: 'No Links', artist: null, coverUrl: null, links: [] },
    {
      id: 3,
      title: 'Low Res Only',
      artist: null,
      coverUrl: 'https://gb.example/img?t=low',
      links: [{ label: 'Spotify', url: 'https://open.spotify.com/track/y' }],
    },
  ],
  products: [{ id: 7, name: 'CD', priceCents: 999 }],
  gigs: [
    { id: 1, date: '2026-08-01', title: 'Festival', venue: 'Vera', city: 'Groningen' },
    { id: 2, date: '2026-08-02', title: 'Club night', venue: null, city: null },
  ],
}

describe('resolvePage', () => {
  it('resolves widgets against the content snapshot', () => {
    const layout = {
      sections: [
        {
          id: 's1',
          title: 'Music',
          widgets: [
            { id: 'w1', type: 'song', songId: 1 },
            { id: 'w2', type: 'gigs', title: null, limit: 1 },
            { id: 'w3', type: 'merch', title: 'CDs', shopUrl: null, items: [{ productId: 7, imageUrl: null, badge: 'NEW' }] },
          ],
        },
      ],
    }
    const page = resolvePage(content, layout)
    expect(page.band.name).toBe('The Woods')
    const widgets = page.sections[0].widgets
    // Song widgets render a thumbnail, so they keep the small cover even
    // where a high-resolution one exists.
    expect(widgets[0]).toMatchObject({ type: 'song', title: 'Good To See You', coverUrl: 'https://gb.example/img?t=abc' })
    expect(widgets[1].title).toBe('Upcoming Gigs')
    expect(widgets[1].gigs).toHaveLength(1)
    expect(widgets[2].products[0]).toMatchObject({ name: 'CD', badge: 'NEW' })
  })

  it('drops widgets whose content disappeared, and empty sections', () => {
    const layout = {
      sections: [
        {
          id: 's1',
          title: 'Gone',
          widgets: [
            { id: 'w1', type: 'song', songId: 99 },
            { id: 'w2', type: 'song', songId: 2 },
            { id: 'w3', type: 'merch', title: null, shopUrl: null, items: [{ productId: 404, imageUrl: null, badge: null }] },
          ],
        },
      ],
    }
    const page = resolvePage(content, layout)
    expect(page.sections).toHaveLength(0)
  })

  it('leaves the song links the editor hid off the public page', () => {
    const layout = {
      sections: [{ id: 's', title: null, widgets: [{ id: 'w', type: 'song', songId: 1, hiddenLinks: ['https://music.apple.com/album/x'] }] }],
    }
    const widget = resolvePage(content, layout).sections[0].widgets[0]
    expect(widget.links.map((link) => link.url)).toEqual(['https://open.spotify.com/track/x'])
  })

  it('drops a song widget whose every link is hidden', () => {
    const layout = {
      sections: [{ id: 's', title: null, widgets: [{ id: 'w', type: 'song', songId: 3, hiddenLinks: ['https://open.spotify.com/track/y'] }] }],
    }
    expect(resolvePage(content, layout).sections).toHaveLength(0)
  })

  it('resolves platforms widgets with detected platforms and embed descriptors', () => {
    const layout = {
      sections: [{ id: 's', title: null, widgets: [{ id: 'w', type: 'platforms', songId: 1, title: null }] }],
    }
    const page = resolvePage(content, layout)
    const widget = page.sections[0].widgets[0]
    expect(widget.type).toBe('platforms')
    expect(widget.platforms[0]).toMatchObject({ id: 'spotify', label: 'Spotify' })
    expect(widget.platforms[0].embed).toMatchObject({ type: 'spotify', display: 'inline' })
    expect(widget.platforms[1]).toMatchObject({ id: 'apple', label: 'Apple Music', embed: null })
  })

  it('resolves embed widgets with a server-derived player descriptor', () => {
    const layout = {
      sections: [
        {
          id: 's',
          title: null,
          widgets: [
            { id: 'w1', type: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Video', description: null, imageUrl: null },
            { id: 'w2', type: 'embed', url: 'https://example.com/page', title: 'Plain', description: null, imageUrl: null },
          ],
        },
      ],
    }
    const widgets = resolvePage(content, layout).sections[0].widgets
    expect(widgets[0].embed).toMatchObject({ type: 'youtube', display: 'overlay' })
    expect(widgets[1].embed).toBeNull()
  })

  it('resolves a release header from the stored snapshot + live cover', () => {
    const layout = { sections: [{ id: 's', title: null, widgets: [{ id: 'w', type: 'platforms', songId: 1, title: null }] }] }
    const page = resolvePage(content, layout, { songId: 1, title: 'Good To See You', artist: null })
    // A release page is artwork-led, so it takes the high-resolution cover.
    expect(page.release).toEqual({
      title: 'Good To See You',
      artist: 'The Woods',
      coverUrl: 'https://gb.example/img?t=abc-hi',
    })
    // Songs exported before high-resolution art existed keep working.
    const lowRes = resolvePage(content, layout, { songId: 3, title: 'Low Res Only', artist: null })
    expect(lowRes.release.coverUrl).toBe('https://gb.example/img?t=low')
    // Song deleted in gigbuddy: title survives (snapshot), cover degrades.
    const gone = resolvePage(content, layout, { songId: 99, title: 'Old Single', artist: 'X' })
    expect(gone.release).toEqual({ title: 'Old Single', artist: 'X', coverUrl: null })
    // Main pages carry no release.
    expect(resolvePage(content, layout).release).toBeNull()
  })

  it('passes the band through, normalizing booking, or null when absent', () => {
    const layout = { sections: [] }
    expect(resolvePage({ band: { name: 'A' } }, layout).band).toEqual({ name: 'A', booking: null })
    expect(resolvePage({}, layout).band).toBeNull()
  })

  describe('booking', () => {
    const layout = { sections: [] }
    const booking = (extra) => resolvePage({ band: { name: 'A', booking: extra } }, layout).band.booking

    it('publishes the block when the band opted in and left a way to reach them', () => {
      expect(booking({
        contactEnabled: true,
        email: 'book@woods.example',
        phone: '+31 6 12345678',
        feeLowCents: 50000,
        feeHighCents: 120000,
        currency: 'eur',
        repertoire: 'covers',
      })).toEqual({
        email: 'book@woods.example',
        phone: '+31 6 12345678',
        feeLowCents: 50000,
        feeHighCents: 120000,
        currency: 'EUR',
        repertoire: 'covers',
      })
    })

    it('publishes nothing at all without the opt-in, fee indication included', () => {
      expect(booking({
        contactEnabled: false,
        email: 'book@woods.example',
        phone: '+31 6 12345678',
        feeLowCents: 50000,
        feeHighCents: 120000,
        currency: 'EUR',
        repertoire: 'covers',
      })).toBeNull()
      expect(booking(undefined)).toBeNull()
      expect(booking(null)).toBeNull()
    })

    it('drops an opted-in band with no reachable contact', () => {
      expect(booking({ contactEnabled: true, email: null, phone: null, feeLowCents: 50000 })).toBeNull()
      expect(booking({ contactEnabled: true, email: '  ', phone: '' })).toBeNull()
      // An unusable address is the same as none when it is the only contact.
      expect(booking({ contactEnabled: true, email: 'not-an-address', phone: null })).toBeNull()
    })

    it('keeps a usable half of a partial contact', () => {
      expect(booking({ contactEnabled: true, email: 'book@woods.example', phone: null }))
        .toMatchObject({ email: 'book@woods.example', phone: null })
      expect(booking({ contactEnabled: true, email: 'not-an-address', phone: '+31 6 12345678' }))
        .toMatchObject({ email: null, phone: '+31 6 12345678' })
    })

    it('normalizes fee, currency and repertoire, dropping unusable values', () => {
      expect(booking({ contactEnabled: true, email: 'book@woods.example' }))
        .toMatchObject({ feeLowCents: null, feeHighCents: null, currency: 'EUR', repertoire: null })
      expect(booking({
        contactEnabled: true,
        email: 'book@woods.example',
        feeLowCents: -1,
        feeHighCents: 1.5,
        currency: 'euros',
        repertoire: 'jazz',
      })).toMatchObject({ feeLowCents: null, feeHighCents: null, currency: 'EUR', repertoire: null })
      expect(booking({ contactEnabled: true, email: 'book@woods.example', currency: 'gbp' }).currency).toBe('GBP')
      // Cutting this to three letters names a currency the band never did.
      expect(booking({ contactEnabled: true, email: 'book@woods.example', currency: 'usdollar' }).currency).toBe('EUR')
    })

    // A truncated contact still looks usable and reaches the wrong band.
    it('drops an over-long contact rather than truncating it into a wrong one', () => {
      expect(booking({
        contactEnabled: true,
        email: `${'a'.repeat(300)}@woods.example`,
        phone: '9'.repeat(200),
      })).toBeNull()
      // Truncation here leaves an address that still parses as one.
      expect(booking({
        contactEnabled: true,
        email: `${'a'.repeat(240)}@example.com${'x'.repeat(40)}`,
        phone: null,
      })).toBeNull()
      expect(booking({ contactEnabled: true, email: null, phone: `+31 6 12345678 ext ${'9'.repeat(40)}` }))
        .toBeNull()
    })

    it('keeps a fee range the right way round', () => {
      expect(booking({ contactEnabled: true, email: 'book@woods.example', feeLowCents: 120000, feeHighCents: 50000 }))
        .toMatchObject({ feeLowCents: 50000, feeHighCents: 120000 })
    })
  })

  it('passes the layout background through, defaulting to none', () => {
    const band = { name: 'A' }
    expect(resolvePage({ band }, { background: 'blobs', sections: [] }).background).toBe('blobs')
    // A layout stored before backgrounds existed, or carrying a key this build
    // doesn't know, still resolves to something the page can paint.
    expect(resolvePage({ band }, { sections: [] }).background).toBe('none')
    expect(resolvePage({ band }, { background: 'lasers', sections: [] }).background).toBe('none')
    expect(resolvePage({ band }, null).background).toBe('none')
  })

  it('passes the layout showBanner flag through, defaulting to false', () => {
    const band = { name: 'A', bannerUrl: 'https://gb.example/banner.jpg' }
    expect(resolvePage({ band }, { showBanner: true, sections: [] }).showBanner).toBe(true)
    expect(resolvePage({ band }, { showBanner: false, sections: [] }).showBanner).toBe(false)
    expect(resolvePage({ band }, { sections: [] }).showBanner).toBe(false)
    expect(resolvePage({ band }, null).showBanner).toBe(false)
  })

  it('normalizes the layout theme to a light/dark opt-in, falling back by page type', () => {
    const band = { name: 'A' }
    // Explicit choice wins on a main page...
    expect(resolvePage({ band }, { theme: 'dark', sections: [] }).theme).toBe('dark')
    expect(resolvePage({ band }, { theme: 'light', sections: [] }).theme).toBe('light')
    // ...and on a release page, in both directions.
    const release = { songId: 1, title: 'Single', artist: 'A' }
    expect(resolvePage({ band }, { theme: 'light', sections: [] }, release).theme).toBe('light')
    expect(resolvePage({ band }, { theme: 'dark', sections: [] }, release).theme).toBe('dark')
    // Missing/unset/unknown falls back by page type: light on the main page,
    // dark on a release page.
    expect(resolvePage({ band }, { sections: [] }).theme).toBe('light')
    expect(resolvePage({ band }, { theme: 'neon', sections: [] }).theme).toBe('light')
    expect(resolvePage({ band }, { sections: [] }, release).theme).toBe('dark')
    expect(resolvePage({ band }, { theme: 'neon', sections: [] }, release).theme).toBe('dark')
    expect(resolvePage({ band }, null).theme).toBe('light')
  })

  it('resolves the theme variant against the scheme the page renders in', () => {
    const band = { name: 'A' }
    const release = { songId: 1, title: 'Single', artist: 'A' }
    // A variant of the page's own scheme is kept...
    expect(resolvePage({ band }, { theme: 'light', themeVariant: 'light-sand', sections: [] }).themeVariant).toBe('light-sand')
    expect(resolvePage({ band }, { theme: 'dark', themeVariant: 'dark-forest', sections: [] }).themeVariant).toBe('dark-forest')
    // ...one belonging to the other scheme falls back to the scheme's default,
    // so the page is never painted in a palette built for the opposite scheme.
    expect(resolvePage({ band }, { theme: 'light', themeVariant: 'dark-forest', sections: [] }).themeVariant).toBe('light')
    expect(resolvePage({ band }, { theme: 'dark', themeVariant: 'light-sand', sections: [] }).themeVariant).toBe('dark')
    // The same check runs against the auto fallback: light on the main page,
    // dark on a release page.
    expect(resolvePage({ band }, { themeVariant: 'light-sky', sections: [] }).themeVariant).toBe('light-sky')
    expect(resolvePage({ band }, { themeVariant: 'light-sky', sections: [] }, release).themeVariant).toBe('dark')
    // Missing or unknown resolves to the scheme's default on both page kinds.
    expect(resolvePage({ band }, { sections: [] }).themeVariant).toBe('light')
    expect(resolvePage({ band }, { themeVariant: 'neon', sections: [] }, release).themeVariant).toBe('dark')
    expect(resolvePage({ band }, null).themeVariant).toBe('light')
  })

  it('passes the layout font through, defaulting to system on both page kinds', () => {
    const band = { name: 'A' }
    const release = { songId: 1, title: 'Single', artist: 'A' }
    expect(resolvePage({ band }, { font: 'oswald', sections: [] }).font).toBe('oswald')
    expect(resolvePage({ band }, { font: 'oswald', sections: [] }, release).font).toBe('oswald')
    // A layout stored before fonts existed, or carrying a key this build doesn't
    // know, still resolves to something the page can render.
    expect(resolvePage({ band }, { sections: [] }).font).toBe('system')
    expect(resolvePage({ band }, { font: 'papyrus', sections: [] }).font).toBe('system')
    expect(resolvePage({ band }, null).font).toBe('system')
  })

  it('survives an empty snapshot', () => {
    const page = resolvePage({}, { sections: [{ id: 's', title: null, widgets: [{ id: 'w', type: 'gigs', limit: 5 }] }] })
    expect(page.sections[0].widgets[0].gigs).toEqual([])
  })
})
