import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'

// The panel's only network call; each test sets the payload it resolves with.
const state = { stats: null }
vi.mock('../../../lib/api.js', () => ({
  getStats: () => Promise.resolve(state.stats),
}))

const { default: StatsPanel } = await import('../components/StatsPanel.jsx')

// The panel formats dates in the browser's locale, so the expectations have to
// as well ('1 Jun' in en-US, '1 jun' in nl-NL).
const label = (day) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00`))

function mockStats(overrides = {}) {
  const byDay = overrides.byDay ?? []
  return {
    enabled: true,
    retentionDays: 30,
    totalViews: byDay.reduce((sum, d) => sum + d.views, 0),
    uniqueVisits: 9,
    totalClicks: 4,
    clickThroughRate: 12.5,
    byDevice: [],
    bySource: [],
    byCountry: [],
    byTarget: [],
    byPlatform: [],
    conversionBySource: [],
    ...overrides,
    byDay,
  }
}

function days(count, viewsFor, clicksFor = () => ({})) {
  return Array.from({ length: count }, (_, i) => ({
    day: `2026-06-${String(i + 1).padStart(2, '0')}`,
    views: viewsFor(i),
    clicks: clicksFor(i),
  }))
}

async function renderPanel(stats, { pageType = 'main' } = {}) {
  state.stats = stats
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <StatsPanel session="s" pageId="p1" pageType={pageType} />
    </ThemeProvider>,
  )
  return screen
}

const barLabels = () => [...document.querySelectorAll('.MuiBarChart-label')].map((el) => el.textContent)

afterEach(cleanup)

describe('StatsPanel views-per-day chart', () => {
  it('labels the x axis with dates and every bar with its count', async () => {
    const screen = await renderPanel(mockStats({ byDay: days(4, (i) => (i + 1) * 3) }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()

    // Dates below the chart, formatted (not raw ISO).
    await expect.element(screen.getByText(label('2026-06-01'), { exact: true })).toBeVisible()
    await expect.element(screen.getByText(label('2026-06-04'), { exact: true })).toBeVisible()
    expect(screen.container.textContent).not.toContain('2026-06-01')

    // Few enough days that the bars are wide: all counts are drawn.
    expect(barLabels()).toEqual(['3', '6', '9', '12'])
  })

  it('thins date ticks on a long range, keeping the most recent day', async () => {
    const screen = await renderPanel(mockStats({ byDay: days(30, () => 5) }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()

    const ticks = [...document.querySelectorAll('.MuiChartsAxis-bottom .MuiChartsAxis-tickLabel')]
    expect(ticks.length).toBeGreaterThan(1)
    expect(ticks.length).toBeLessThan(12)
    // Not ellipsized ('30 …') by the edge of the drawing area.
    expect(ticks.at(-1).textContent).toBe(label('2026-06-30'))
  })

  it('drops bar labels once the bars are too narrow to carry them', async () => {
    const screen = await renderPanel(mockStats({ byDay: days(30, () => 5) }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()
    expect(barLabels()).toEqual([])
  })

  it('stacks the click kinds that occurred on top of the views, each in its own colour', async () => {
    const screen = await renderPanel(mockStats({
      byDay: days(3, () => 10, (i) => (i === 0 ? { platform: 2 } : { platform: 1, share: 3 })),
    }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()

    // A legend entry per series present — and none for the kinds that never happened.
    const legend = [...document.querySelectorAll('.MuiChartsLegend-series')].map((el) => el.textContent)
    expect(legend).toEqual(['Views', 'Streaming', 'Shares'])

    // Three stacks of three segments, views neutral and each kind on its own slot.
    const fills = new Set([...document.querySelectorAll('.MuiBarChart-element')].map((el) => el.getAttribute('fill') ?? getComputedStyle(el).fill))
    expect(document.querySelectorAll('.MuiBarChart-element')).toHaveLength(8)
    expect(fills.size).toBe(3)
  })

  it('counts gig and press clicks as links rather than Other', async () => {
    const screen = await renderPanel(mockStats({ byDay: days(2, () => 4, () => ({ gig: 1, accolade: 2 })) }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()

    const legend = [...document.querySelectorAll('.MuiChartsLegend-series')].map((el) => el.textContent)
    expect(legend).toEqual(['Views', 'Links'])
  })

  it('folds an unknown click kind into Other rather than dropping it', async () => {
    const screen = await renderPanel(mockStats({ byDay: days(2, () => 4, () => ({ mystery: 2 })) }))
    await expect.element(screen.getByText('Views and clicks per day')).toBeVisible()

    const legend = [...document.querySelectorAll('.MuiChartsLegend-series')].map((el) => el.textContent)
    expect(legend).toEqual(['Views', 'Other'])
  })
})

describe('StatsPanel device / country pies', () => {
  const byDevice = [
    { key: 'mobile', views: 70 },
    { key: 'desktop', views: 25 },
    { key: 'tablet', views: 4 },
    { key: 'bot', views: 1 },
  ]

  it('shows percentages on the arcs and the exact counts in the table', async () => {
    const screen = await renderPanel(mockStats({ byDevice }))
    await expect.element(screen.getByText('Devices')).toBeVisible()

    // The 4% and 1% slivers are too thin to carry a label; they live in the
    // table instead.
    await expect.poll(() => [...document.querySelectorAll('.MuiPieChart-arcLabel')].map((el) => el.textContent).filter(Boolean)).toEqual(['70%', '25%'])

    // Exact amounts (and the share, for the slices the pie can't label) in the
    // table under the pie: label + count + percentage.
    const panel = screen.getByText('Devices').element().closest('.MuiCard-root')
    const rows = [...panel.querySelectorAll('tbody tr')].map((tr) => tr.textContent)
    expect(rows).toEqual(['Mobile7070%', 'Desktop2525%', 'Tablet44%', 'Bots11%'])
  })

  it('names countries from their ISO code and folds the tail into Other', async () => {
    const screen = await renderPanel(mockStats({
      byCountry: [
        { key: 'NL', views: 40 },
        { key: 'BE', views: 30 },
        { key: 'DE', views: 10 },
        { key: 'FR', views: 8 },
        { key: 'GB', views: 6 },
        { key: 'ES', views: 4 },
        { key: 'IT', views: 2 },
      ],
    }))
    await expect.element(screen.getByText('Countries')).toBeVisible()

    // Region names are locale-dependent too ('Netherlands' / 'Nederland').
    const region = new Intl.DisplayNames(undefined, { type: 'region' })
    await expect.element(screen.getByText(region.of('NL'), { exact: true })).toBeVisible()
    // Beyond the fifth slice the tail is one neutral bucket, not more colours.
    await expect.element(screen.getByText('Other (2)')).toBeVisible()
    expect(screen.container.textContent).not.toContain(region.of('IT'))
  })

  it('says so when a dimension has no data', async () => {
    const screen = await renderPanel(mockStats({ byDevice: [] }))
    await expect.element(screen.getByText('Devices')).toBeVisible()
    await expect.element(screen.getByText('No data yet').first()).toBeVisible()
    expect(document.querySelectorAll('.MuiPieChart-arc')).toHaveLength(0)
  })
})

// Fill width as a fraction of its track.
function barFill(row) {
  const track = row.querySelector('[data-bar-track]').getBoundingClientRect().width
  return row.querySelector('[data-bar-fill]').getBoundingClientRect().width / track
}

const blockRows = (screen, title) => [...screen.getByText(title, { exact: true }).element().closest('.MuiCard-root').querySelectorAll('[data-bar-row]')]

describe('StatsPanel streaming platforms', () => {
  const byPlatform = [
    { key: 'spotify', clicks: 6 },
    { key: 'other', clicks: 3 },
    { key: 'apple', clicks: 1 },
  ]

  it('names every platform clicked with its count and share of platform clicks', async () => {
    const screen = await renderPanel(mockStats({ byPlatform }))
    await expect.element(screen.getByText('Streaming platforms')).toBeVisible()

    const rows = blockRows(screen, 'Streaming platforms')
    expect(rows.map((row) => row.textContent)).toEqual(['Spotify660%', 'Apple Music110%', 'Other330%'])
    // An icon per platform carries its identity; the bars all share one colour.
    for (const row of rows) expect(row.querySelector('svg')).not.toBeNull()
    await expect.element(screen.getByText('10 clicks')).toBeVisible()
  })

  it("draws each bar as the platform's share of all platform clicks", async () => {
    const screen = await renderPanel(mockStats({ byPlatform }))
    await expect.element(screen.getByText('Streaming platforms')).toBeVisible()

    const [spotify, apple, other] = blockRows(screen, 'Streaming platforms')
    expect(barFill(spotify)).toBeCloseTo(0.6, 1)
    expect(barFill(apple)).toBeCloseTo(0.1, 1)
    expect(barFill(other)).toBeCloseTo(0.3, 1)
  })

  it('waits for the first platform click on a release page', async () => {
    const screen = await renderPanel(mockStats(), { pageType: 'release' })
    await expect.element(screen.getByText('Streaming platforms')).toBeVisible()
    await expect.element(screen.getByText('No platform clicks yet')).toBeVisible()
  })

  it('stays out of the way on a main page without platform links', async () => {
    const screen = await renderPanel(mockStats())
    await expect.element(screen.getByText('Devices')).toBeVisible()
    expect(screen.container.textContent).not.toContain('Streaming platforms')
  })
})

describe('StatsPanel link and action list', () => {
  it('names each target the visitor reached', async () => {
    const screen = await renderPanel(mockStats({
      byTarget: [
        { key: 'book:email', clicks: 5, outbound: true },
        { key: 'book:phone', clicks: 2, outbound: true },
        { key: 'gig:live paradiso', clicks: 2, outbound: true },
        { key: 'accolade:pitchfork.com', clicks: 1, outbound: true },
      ],
    }))
    await expect.element(screen.getByText('Booking · Email')).toBeVisible()
    await expect.element(screen.getByText('Booking · Phone')).toBeVisible()
    await expect.element(screen.getByText('Gig · live paradiso')).toBeVisible()
    await expect.element(screen.getByText('Press · pitchfork.com')).toBeVisible()
  })

  it('scales the bars to the most clicked target, even one that is not a link click', async () => {
    // totalClicks leaves shares out, so measuring against it would overflow.
    const screen = await renderPanel(mockStats({
      totalClicks: 4,
      byTarget: [
        { key: 'share:whatsapp', clicks: 8, outbound: false },
        { key: 'link:tickets', clicks: 4, outbound: true },
      ],
    }))
    await expect.element(screen.getByText('Share · WhatsApp')).toBeVisible()

    const [share, tickets] = blockRows(screen, 'Links and actions')
    expect(barFill(share)).toBeCloseTo(1, 1)
    expect(barFill(tickets)).toBeCloseTo(0.5, 1)
  })

  it('sets apart the targets that do not count as link clicks', async () => {
    const screen = await renderPanel(mockStats({
      byTarget: [
        { key: 'share:whatsapp', clicks: 8, outbound: false },
        { key: 'link:tickets', clicks: 4, outbound: true },
      ],
    }))
    await expect.element(screen.getByText('Share · WhatsApp')).toBeVisible()

    const [share, tickets] = blockRows(screen, 'Links and actions')
    const fillColor = (row) => getComputedStyle(row.querySelector('[data-bar-fill]')).backgroundColor
    expect(fillColor(share)).not.toBe(fillColor(tickets))
    await expect.element(screen.getByText(/not counted as link clicks/)).toBeVisible()
  })
})
