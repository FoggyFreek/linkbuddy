// Mock data for the screen-render tests. Shapes mirror what the server's
// resolve.js / editor endpoints return, so the real components render against
// realistic input without a live API. One place so every screen test agrees.

const socials = { instagram: 'neonharbour', youtube: '@neonharbour', spotify: 'artist/6xyz', tiktok: '@neonharbour' }

// A resolved band ("main") page as getPublicPage/getPreview return it: every
// widget type present so one screenshot validates them all.
export function bandPage(theme = 'light') {
  return {
    band: { name: 'Neon Harbour', bio: 'Synth-pop from the harbour city — three friends and a drum machine.', slug: 'neon-harbour', socials, theme, logoUrl: null },
    release: null,
    sections: [
      {
        id: 'sec-latest',
        title: 'Latest release',
        widgets: [
          {
            id: 'w-song', type: 'song', title: 'Midnight Signal', artist: 'Neon Harbour', coverUrl: null,
            links: [
              { url: '#', label: 'Listen' },
              { url: '#', label: 'Spotify', platform: { id: 'spotify', label: 'Spotify' } },
              { url: '#', label: 'Apple Music', platform: { id: 'apple', label: 'Apple Music' } },
            ],
          },
          {
            id: 'w-embed', type: 'embed', url: '#', title: 'Full album on Spotify', description: 'Neon Harbour — Harbour Lights EP',
            imageUrl: null, embed: { display: 'inline', type: 'spotify', src: 'about:blank', height: 152 },
          },
        ],
      },
      {
        id: 'sec-more',
        title: 'More',
        widgets: [
          { id: 'w-link', type: 'link', label: 'Official shop', sublabel: 'Vinyl & merch', url: '#', icon: 'globe', imageUrl: null },
          {
            id: 'w-gigs', type: 'gigs', title: 'Upcoming Gigs',
            gigs: [
              { id: 'g1', date: '2026-08-14', title: 'Harbour Festival', venue: 'Pier Stage', city: 'Rotterdam' },
              { id: 'g2', date: '2026-09-02', title: 'Club Night', venue: 'Neon Room', city: 'Berlin' },
            ],
          },
          {
            id: 'w-merch', type: 'merch', title: 'Merch', shopUrl: '#',
            products: [
              { id: 'p1', name: 'Tour T-shirt', priceCents: 2500, imageUrl: null, badge: 'New' },
              { id: 'p2', name: 'Harbour Lights Vinyl', priceCents: 3200, imageUrl: null, badge: null },
              { id: 'p3', name: 'Enamel Pin', priceCents: 800, imageUrl: null, badge: null },
            ],
          },
        ],
      },
    ],
  }
}

// A resolved release page: two-pane artwork + content layout with a platforms
// ("choose your platform") widget.
export function releasePage(theme = 'light') {
  return {
    band: { name: 'Neon Harbour', slug: 'neon-harbour', socials, theme, logoUrl: null },
    release: { title: 'Midnight Signal', artist: 'Neon Harbour', coverUrl: null },
    sections: [
      {
        id: 'sec-stream',
        title: null,
        widgets: [
          {
            id: 'w-platforms', type: 'platforms', title: 'Stream now',
            platforms: [
              { id: 'spotify', label: 'Spotify', url: '#' },
              { id: 'apple', label: 'Apple Music', url: '#' },
              { id: 'youtube', label: 'YouTube Music', url: '#' },
              { id: 'other', label: 'Bandcamp', url: '#' },
            ],
          },
        ],
      },
    ],
  }
}

// ---- Editor fixtures (unresolved content + draft layout) ----

const editorContent = {
  band: { name: 'Neon Harbour', bio: 'Synth-pop from the harbour city.', slug: 'neon-harbour', socials, theme: 'light' },
  songs: [
    { id: 's1', title: 'Midnight Signal' },
    { id: 's2', title: 'Coastline' },
  ],
  products: [
    { id: 'p1', name: 'Tour T-shirt', priceCents: 2500 },
    { id: 'p2', name: 'Harbour Lights Vinyl', priceCents: 3200 },
  ],
}

const draftLayout = {
  sections: [
    {
      id: 'sec1', title: 'Latest release',
      widgets: [
        { id: 'w1', type: 'song', songId: 's1' },
        { id: 'w2', type: 'link', label: 'Official shop', url: '#', sublabel: 'Vinyl & merch', icon: 'globe', imageUrl: null },
      ],
    },
    {
      id: 'sec2', title: null,
      widgets: [
        { id: 'w3', type: 'gigs', title: 'Upcoming Gigs', limit: 10 },
      ],
    },
  ],
}

export const editorPages = [
  { id: 'page-main', slug: 'neon-harbour', pageType: 'main', release: null, publishedAt: '2026-07-01T10:00:00.000Z' },
  { id: 'page-rel', slug: 'neon-harbour/midnight-signal', pageType: 'release', release: { title: 'Midnight Signal' }, publishedAt: null },
]

export function editorPage() {
  return {
    id: 'page-main', slug: 'neon-harbour', pageType: 'main', release: null,
    content: editorContent, draftLayout,
    publishedAt: '2026-07-01T10:00:00.000Z',
    publicUrl: 'https://linkbuddy.example/neon-harbour',
  }
}

export function stats() {
  const byDay = Array.from({ length: 14 }, (_, i) => ({
    day: `2026-07-${String(i + 1).padStart(2, '0')}`,
    views: Math.round(40 + 30 * Math.sin(i / 2) + i),
  }))
  return {
    enabled: true, retentionDays: 90,
    totalViews: 1284, uniqueVisits: 912, totalClicks: 437, clickThroughRate: 34,
    byDay,
    byTarget: [
      { key: 'spotify', clicks: 180 }, { key: 'apple', clicks: 120 }, { key: 'youtube', clicks: 84 }, { key: 'shop', clicks: 53 },
    ],
    byDevice: [{ key: 'mobile', views: 900 }, { key: 'desktop', views: 320 }, { key: 'tablet', views: 64 }],
    byCountry: [{ key: 'NL', views: 540 }, { key: 'DE', views: 410 }, { key: 'BE', views: 210 }, { key: 'FR', views: 124 }],
    conversionBySource: [
      { key: 'instagram', views: 520, clicks: 205, ctr: 39 },
      { key: 'direct', views: 430, clicks: 120, ctr: 28 },
      { key: 'facebook', views: 220, clicks: 62, ctr: 28 },
      { key: 'youtube', views: 114, clicks: 50, ctr: 44 },
    ],
  }
}
