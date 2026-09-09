import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { page as browser } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../lib/theme.js'

// Phones get both public pages edge to edge — full width and height, no artwork
// around them — while wider viewports keep the framed look. Real geometry, both widths.
const state = { page: null }
vi.mock('../../lib/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../routes/BandPage.jsx')
const { default: ReleasePage } = await import('../routes/ReleasePage.jsx')

const MOBILE = [390, 844]
const DESKTOP = [1000, 900]

function mockPage(overrides = {}) {
  return {
    background: 'glow',
    sections: [{ id: 's1', widgets: [{ id: 'w1', type: 'link', label: 'Official shop', url: '#', icon: 'globe' }] }],
    band: { name: 'The Testers', slug: 'testers', socials: {} },
    ...overrides,
  }
}

function renderAt(Route, slug) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Route slug={slug} />
    </ThemeProvider>,
  )
}

// `body ` matters: <html> also carries data-theme (the app's own scheme).
const scope = () => document.querySelector('body [data-theme]')

afterEach(cleanup)
afterAll(async () => { await browser.viewport(...DESKTOP) })

describe('band page at mobile width', () => {
  it('runs the card edge to edge and drops the background artwork', async () => {
    await browser.viewport(...MOBILE)
    state.page = mockPage()
    const screen = await renderAt(BandPage, 'testers')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    const card = scope().querySelector('.MuiCard-root')
    const cardBox = card.getBoundingClientRect()
    const scopeBox = scope().getBoundingClientRect()
    expect(cardBox.left).toBeCloseTo(scopeBox.left, 0)
    expect(cardBox.right).toBeCloseTo(scopeBox.right, 0)
    expect(cardBox.top).toBeCloseTo(scopeBox.top, 0)
    // Full height: the card runs to the bottom of the viewport.
    expect(cardBox.height).toBeGreaterThanOrEqual(window.innerHeight - 1)
    // No rounded corners left to show, so no artwork behind them either.
    expect(getComputedStyle(card).borderTopLeftRadius).toBe('0px')
    expect(getComputedStyle(scope()).backgroundImage).toBe('none')
  })
})

describe('band page at desktop width', () => {
  it('keeps the centered card on top of the page background', async () => {
    await browser.viewport(...DESKTOP)
    state.page = mockPage()
    const screen = await renderAt(BandPage, 'testers')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    const cardBox = scope().querySelector('.MuiCard-root').getBoundingClientRect()
    const scopeBox = scope().getBoundingClientRect()
    expect(cardBox.left - scopeBox.left).toBeGreaterThan(8)
    expect(getComputedStyle(scope()).backgroundImage).toContain('url(')
  })
})

describe('release page at mobile width', () => {
  it('runs the cover full width and drops the background artwork', async () => {
    await browser.viewport(...MOBILE)
    state.page = mockPage({ release: { title: 'Hurricane EP', artist: 'The Testers' } })
    const screen = await renderAt(ReleasePage, 'testers/hurricane')
    await expect.element(screen.getByText('Hurricane EP')).toBeInTheDocument()

    const scopeBox = scope().getBoundingClientRect()
    // The stacked content column spans the viewport: no gutters left over.
    const column = scope().querySelector('header').parentElement
    expect(column.getBoundingClientRect().width).toBeCloseTo(scopeBox.width, 0)
    expect(scopeBox.height).toBeGreaterThanOrEqual(window.innerHeight - 1)
    expect(getComputedStyle(scope()).backgroundImage).toBe('none')
  })
})

describe('release page at desktop width', () => {
  it('keeps the page background visible', async () => {
    await browser.viewport(...DESKTOP)
    state.page = mockPage({ release: { title: 'Hurricane EP', artist: 'The Testers' } })
    const screen = await renderAt(ReleasePage, 'testers/hurricane')
    await expect.element(screen.getByText('Hurricane EP')).toBeInTheDocument()

    expect(getComputedStyle(scope()).backgroundImage).toContain('url(')
  })
})
