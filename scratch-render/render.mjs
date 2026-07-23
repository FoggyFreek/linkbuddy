import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = new URL('./shots/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5174'

// ---- inline artwork (data URIs) so nothing loads over the network ----
const cover = (a, b, glyph) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><text x="50%" y="54%" font-family="Georgia,serif" font-size="240" fill="rgba(255,255,255,.92)" text-anchor="middle">${glyph}</text></svg>`,
  )

const logo = cover('#6d28d9', '#db2777', '🦉')
const coverMidnight = cover('#0f172a', '#3b82f6', '☾')
const coverEmber = cover('#7c2d12', '#f59e0b', '✦')
const merchTee = cover('#111827', '#374151', 'T')
const merchVinyl = cover('#1e1b4b', '#6d28d9', '●')

const socials = { instagram: 'nightjar.band', facebook: 'nightjarband', youtube: '@nightjar', tiktok: '@nightjar', spotify: 'artist/xyz' }

// ---- resolved public page (band, light) ----
const bandSections = [
  {
    id: 's1',
    title: null,
    widgets: [
      {
        id: 'w1', type: 'song', title: 'Midnight Signals', artist: 'Nightjar', coverUrl: coverMidnight,
        links: [{ url: 'https://example.com/s', label: 'Spotify' }, { url: '#', label: 'Apple Music' }, { url: '#', label: 'YouTube' }],
      },
      {
        id: 'w2', type: 'gigs', title: 'Upcoming Gigs',
        gigs: [
          { id: 'g1', date: '2026-08-14', title: 'Summer Nights Festival', venue: 'Riverside Stage', city: 'Portland' },
          { id: 'g2', date: '2026-09-02', title: 'Album Release Show', venue: 'The Fillmore', city: 'San Francisco' },
          { id: 'g3', date: '2026-09-20', title: 'Autumn Tour', venue: 'Bowery Ballroom', city: 'New York' },
        ],
      },
      {
        id: 'w3', type: 'merch', title: 'Merch',
        shopUrl: 'https://shop.example.com',
        products: [
          { id: 'p1', name: 'Tour T-Shirt', priceCents: 2500, imageUrl: merchTee, badge: 'New' },
          { id: 'p2', name: 'Midnight Signals Vinyl', priceCents: 3200, imageUrl: merchVinyl, badge: null },
          { id: 'p3', name: 'Enamel Pin', priceCents: 900, imageUrl: null, badge: null },
        ],
      },
      { id: 'w4', type: 'link', label: 'Join the mailing list', sublabel: 'Tour dates & new music', url: '#', icon: 'globe', imageUrl: null },
    ],
  },
]

const bandPage = (theme) => ({
  band: { name: 'Nightjar', slug: 'nightjar', logoUrl: logo, bio: 'Dream-pop from the Pacific Northwest. New album “Midnight Signals” out now.', socials, theme },
  sections: bandSections,
})

// ---- resolved release / smart-link page (platforms) ----
const emb = (type, display, src) => ({ type, display, src })
const releasePage = {
  band: { name: 'Nightjar', slug: 'nightjar', logoUrl: logo, socials, theme: 'light' },
  release: { title: 'Midnight Signals', artist: 'Nightjar', coverUrl: coverMidnight },
  sections: [
    {
      id: 'rs1', title: null,
      widgets: [
        {
          id: 'rp', type: 'platforms', title: 'Choose your platform',
          platforms: [
            { id: 'spotify', label: 'Spotify', url: '#', embed: emb('spotify', 'inline', 'https://open.spotify.com/embed/track/x') },
            { id: 'apple', label: 'Apple Music', url: '#', embed: null },
            { id: 'youtube-music', label: 'YouTube Music', url: '#', embed: emb('youtube', 'overlay', 'https://www.youtube-nocookie.com/embed/x') },
            { id: 'deezer', label: 'Deezer', url: '#', embed: null },
            { id: 'tidal', label: 'TIDAL', url: '#', embed: null },
            { id: 'bandcamp', label: 'Bandcamp', url: '#', embed: null },
          ],
        },
      ],
    },
  ],
}

// ---- editor page (draft layout, unresolved) ----
const content = {
  band: { name: 'Nightjar', slug: 'nightjar', logoUrl: logo, socials, theme: 'light' },
  songs: [
    { id: 'song1', title: 'Midnight Signals', artist: 'Nightjar', coverUrl: coverMidnight, links: [{ url: '#' }] },
    { id: 'song2', title: 'Ember', artist: 'Nightjar', coverUrl: coverEmber, links: [{ url: '#' }] },
  ],
  products: [{ id: 'p1', name: 'Tour T-Shirt', priceCents: 2500 }, { id: 'p2', name: 'Vinyl', priceCents: 3200 }],
  gigs: [{ id: 'g1', date: '2026-08-14', title: 'Summer Nights Festival' }],
}
const editorMain = {
  id: 'pg-main', slug: 'nightjar', pageType: 'main', publishedAt: '2026-07-20T10:00:00Z',
  publicUrl: 'https://link.example.com/nightjar', content,
  draftLayout: {
    sections: [
      { id: 'es1', title: null, widgets: [
        { id: 'ew1', type: 'song', songId: 'song1' },
        { id: 'ew2', type: 'gigs', title: 'Upcoming Gigs', limit: 10 },
        { id: 'ew3', type: 'merch', title: null, shopUrl: null, items: [{ productId: 'p1' }, { productId: 'p2' }] },
        { id: 'ew4', type: 'link', label: 'Join the mailing list', url: '#', icon: 'globe' },
      ] },
    ],
  },
}
const editorPagesList = {
  pages: [
    { id: 'pg-main', slug: 'nightjar', pageType: 'main', publishedAt: '2026-07-20T10:00:00Z', release: null },
    { id: 'pg-rel', slug: 'nightjar/midnight-signals', pageType: 'release', publishedAt: '2026-07-21T10:00:00Z', release: { title: 'Midnight Signals' } },
  ],
}

// ---- stats ----
const days = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (n - 1 - i))
  const base = 20 + Math.round(30 * Math.abs(Math.sin(i / 3)))
  return { day: d.toISOString().slice(0, 10), views: base + (i % 5) * 4 }
})
const stats = {
  enabled: true, retentionDays: 90, totalViews: 1284, uniqueVisits: 962, totalClicks: 415, clickThroughRate: 32,
  byDay: days(30),
  byTarget: [
    { key: 'platform:spotify', clicks: 180 }, { key: 'platform:apple', clicks: 92 },
    { key: 'platform:youtube-music', clicks: 61 }, { key: 'link:Join the mailing list', clicks: 44 },
    { key: 'share:whatsapp', clicks: 22 }, { key: 'shop', clicks: 16 },
  ],
  byDevice: [{ key: 'phone', views: 812 }, { key: 'desktop', views: 384 }, { key: 'tablet', views: 88 }],
  byCountry: [{ key: 'US', views: 540 }, { key: 'DE', views: 288 }, { key: 'GB', views: 201 }, { key: 'unknown', views: 255 }],
  conversionBySource: [
    { key: 'instagram', views: 520, clicks: 198, ctr: 38 },
    { key: 'direct', views: 410, clicks: 96, ctr: 23 },
    { key: 'newsletter', views: 214, clicks: 88, ctr: 41 },
    { key: 'google', views: 140, clicks: 33, ctr: 24 },
  ],
}

function json(route, body) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mock(page) {
  await page.route('**/api/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === 'POST' && (url.includes('/view') || url.includes('/click'))) return route.fulfill({ status: 204, body: '' })
    if (url.includes('/api/editor/pages/') && url.includes('/stats')) return json(route, stats)
    if (url.includes('/api/editor/pages/') && url.includes('/preview')) return json(route, bandPage('light'))
    if (url.match(/\/api\/editor\/pages\/[^/]+$/)) return json(route, editorMain)
    if (url.endsWith('/api/editor/pages')) return json(route, editorPagesList)
    if (url.includes('/api/pages/nightjar/midnight-signals')) return json(route, releasePage)
    if (url.includes('/api/pages/nightjar-dark')) return json(route, bandPage('dark'))
    if (url.includes('/api/pages/nightjar')) return json(route, bandPage('light'))
    return json(route, {})
  })
}

const shots = [
  { name: '1-public-band-light', url: '/nightjar', vw: 430, vh: 1500, wait: '.merch-item' },
  { name: '2-public-band-dark', url: '/nightjar-dark', vw: 430, vh: 1400, wait: '.merch-item' },
  { name: '3-release-smartlink-mobile', url: '/nightjar/midnight-signals', vw: 430, vh: 1200, wait: '.platform-card' },
  { name: '4-release-smartlink-desktop', url: '/nightjar/midnight-signals', vw: 1100, vh: 820, wait: '.platform-card' },
  { name: '5-editor-build', url: '/edit', vw: 1000, vh: 1100, wait: '.editor-section', session: true },
  { name: '6-editor-stats', url: '/edit', vw: 1000, vh: 1500, wait: '.stat-tile', session: true, tab: 'Statistics' },
  { name: '7-privacy', url: '/privacy', vw: 800, vh: 1000, wait: '.privacy-page' },
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.vw, height: s.vh }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await mock(page)
  if (s.session) await page.addInitScript(() => sessionStorage.setItem('lp_editor_session', 'mock-session'))
  await page.goto(BASE + s.url, { waitUntil: 'networkidle' })
  if (s.wait) await page.waitForSelector(s.wait, { timeout: 8000 }).catch(() => {})
  if (s.tab) { await page.getByRole('button', { name: s.tab }).click(); await page.waitForSelector('.stat-tile', { timeout: 8000 }).catch(() => {}) }
  await page.waitForTimeout(500)
  await page.screenshot({ path: OUT + s.name + '.png', fullPage: true })
  console.log('shot', s.name)
  await ctx.close()
}
await browser.close()
console.log('done')
