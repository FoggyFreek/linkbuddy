import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'

// The panel's only network call; each test sets the payload it resolves with.
const state = { stats: null }
vi.mock('../../src/api.js', () => ({
  getStats: () => Promise.resolve(state.stats),
}))

const { default: StatsPanel } = await import('../../src/StatsPanel.jsx')

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

async function renderPanel(stats) {
  state.stats = stats
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <StatsPanel session="s" pageId="p1" />
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
