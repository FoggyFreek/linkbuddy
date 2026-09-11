import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { page as browser } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../theme.js'

// A page theme variant repaints the page by overriding palette variables on the
// scope element, so these tests assert the computed colours of that element and
// of a card inside it: the whole subtree must move to the variant's palette
// while the surrounding editor chrome keeps the app's own.
const state = { page: null }
vi.mock('../api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../../app/routes/BandPage.jsx')

function mockPage(pageTheme, themeVariant, background = 'none') {
  return {
    background,
    theme: pageTheme,
    themeVariant,
    sections: [],
    band: { name: 'The Testers', slug: 'testers', socials: {} },
  }
}

async function renderPublicPage(pageTheme, themeVariant, background) {
  state.page = mockPage(pageTheme, themeVariant, background)
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <BandPage slug="testers" />
    </ThemeProvider>,
  )
  await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()
  return document.body.querySelector(`[data-theme="${pageTheme}"]`)
}

afterEach(cleanup)

// The public routes drop the background artwork below `sm` (app/__tests__/mobileBleed.test.jsx),
// so assert at a width that shows it.
beforeAll(async () => { await browser.viewport(1000, 900) })

describe('page theme variants on the public page', () => {
  it('paints the default palette of the page scheme', async () => {
    const scope = await renderPublicPage('dark', 'dark')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(22, 39, 61)')
  })

  it('repaints canvas, cards and text in the chosen variant', async () => {
    const scope = await renderPublicPage('dark', 'dark-forest')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(15, 31, 24)')
    expect(getComputedStyle(scope).color).toBe('rgb(238, 245, 240)')
    // The surfaces inside move with the canvas: the card the links sit on takes
    // the variant's own surface colour, not the theme's midnight blue.
    const surface = scope.querySelector('.MuiPaper-root')
    expect(getComputedStyle(surface).backgroundColor).toBe('rgb(43, 71, 56)')
  })

  it('paints a light variant on a light page', async () => {
    const scope = await renderPublicPage('light', 'light-sand')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(226, 216, 197)')
  })

  // A payload from an older build, or a key this build no longer knows, still
  // renders — on the theme's own scheme colours.
  it('falls back to the theme palette when the payload carries no variant', async () => {
    const scope = await renderPublicPage('light', undefined)
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(220, 222, 226)')
  })

  it('falls back to the theme palette for a variant key this build does not know', async () => {
    const scope = await renderPublicPage('light', 'neon')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(220, 222, 226)')
  })
})

// The three seamless tiles (squares, hexagons, topography) are drawn in the
// theme's own colours rather than a palette of their own, so — like `none` —
// they have to follow the page's chosen variant: the canvas under the tile is
// the variant's canvas, and the ink is drawn in its text colour.
describe('theme-coloured patterns follow the variant', () => {
  it.each(['squares', 'hexagons', 'topography'])('paints %s in the variant palette', async (background) => {
    const scope = await renderPublicPage('dark', 'dark-forest', background)
    const { backgroundColor, backgroundImage, backgroundRepeat } = getComputedStyle(scope)
    expect(backgroundRepeat).toBe('repeat')
    expect(backgroundColor).toBe('rgb(15, 31, 24)') // the forest canvas
    expect(decodeURIComponent(backgroundImage)).toContain('fill="#eef5f0"') // its text colour
  })

  it('draws the tile ink in the light variant text colour on a light page', async () => {
    const scope = await renderPublicPage('light', 'light-sand', 'hexagons')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(226, 216, 197)')
    expect(decodeURIComponent(getComputedStyle(scope).backgroundImage)).toContain('fill="#2a2318"')
  })

  // A scene with a palette of its own keeps it: only the theme-coloured
  // patterns follow the variant.
  it('leaves a scene background on its own artwork palette', async () => {
    const scope = await renderPublicPage('dark', 'dark-forest', 'blobs')
    expect(getComputedStyle(scope).backgroundColor).not.toBe('rgb(15, 31, 24)')
  })

  it('falls back to the scheme default ink when no variant is given', async () => {
    const scope = await renderPublicPage('light', undefined, 'squares')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(220, 222, 226)')
    expect(decodeURIComponent(getComputedStyle(scope).backgroundImage)).toContain('fill="#17181c"')
  })
})
