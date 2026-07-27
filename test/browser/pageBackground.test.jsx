import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import theme from '../../src/theme.js'
import ColorSchemeScope from '../../src/ColorSchemeScope.jsx'
import { PAGE_BACKGROUND_OPTIONS, pageBackgroundSx } from '../../src/pageBackgrounds.js'
import BackgroundPicker from '../../src/editor/BackgroundPicker.jsx'
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../shared/pageBackgrounds.js'

// The page backgrounds are CSS background-images rather than DOM nodes, so these
// tests assert the computed style of the element the artwork is applied to: that
// a chosen background paints, that `none` leaves the theme's plain canvas, and
// that each scene has its own artwork per colour scheme.
const state = { page: null }
vi.mock('../../src/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: PublicPage } = await import('../../src/PublicPage.jsx')

function renderApp(node) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

function mockPage(background) {
  return {
    background,
    sections: [],
    band: { name: 'The Testers', slug: 'testers', socials: {}, theme: 'light' },
  }
}

async function renderPublicPage(background) {
  state.page = mockPage(background)
  const screen = await renderApp(<PublicPage slug="testers" />)
  await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()
  // The scope wrapping the whole page — the element the background is painted
  // on. Searched from <body>, since MUI also puts data-theme on <html>.
  return document.body.querySelector('[data-theme="light"]')
}

afterEach(cleanup)

describe('page backgrounds on the public page', () => {
  it('paints the chosen background artwork behind the page', async () => {
    const scope = await renderPublicPage('blobs')
    const { backgroundImage, backgroundColor, backgroundSize } = getComputedStyle(scope)
    expect(backgroundImage).toContain('data:image/svg+xml')
    expect(backgroundSize).toBe('cover')
    expect(backgroundColor).toBe('rgb(31, 75, 216)') // #1f4bd8, the blobs canvas
  })

  it('leaves the theme canvas alone when no background is set', async () => {
    const scope = await renderPublicPage(DEFAULT_PAGE_BACKGROUND)
    expect(getComputedStyle(scope).backgroundImage).toBe('none')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(220, 222, 226)') // light surface.canvas
  })

  it('falls back to the plain canvas for an unknown key', async () => {
    const scope = await renderPublicPage('lasers')
    expect(getComputedStyle(scope).backgroundImage).toBe('none')
  })

  it('gives every scene its own artwork, and a distinct one per colour scheme', async () => {
    await renderApp(
      <>
        {PAGE_BACKGROUND_KEYS.map((key) => (
          <ColorSchemeScope key={key} mode="light" data-testid={`light-${key}`} sx={pageBackgroundSx(key)} />
        ))}
        {PAGE_BACKGROUND_KEYS.map((key) => (
          <ColorSchemeScope key={key} mode="dark" data-testid={`dark-${key}`} sx={pageBackgroundSx(key)} />
        ))}
      </>,
    )
    const imageOf = (id) => getComputedStyle(document.querySelector(`[data-testid="${id}"]`)).backgroundImage
    const scenes = PAGE_BACKGROUND_KEYS.filter((key) => key !== DEFAULT_PAGE_BACKGROUND)
    const light = scenes.map((key) => imageOf(`light-${key}`))
    for (const [i, key] of scenes.entries()) {
      expect(light[i]).toContain('data:image/svg+xml')
      // The dark colourway is a different drawing, not the same one recoloured
      // by CSS (custom properties don't resolve inside a data-URI SVG).
      expect(imageOf(`dark-${key}`)).not.toBe(light[i])
    }
    // Distinct scenes, not three copies of one.
    expect(new Set(light).size).toBe(scenes.length)
    expect(imageOf(`light-${DEFAULT_PAGE_BACKGROUND}`)).toBe('none')
  })
})

describe('BackgroundPicker', () => {
  it('offers every background and reports the picked key', async () => {
    const onChange = vi.fn()
    const screen = await renderApp(
      <Box>
        <BackgroundPicker value={DEFAULT_PAGE_BACKGROUND} mode="light" onChange={onChange} />
      </Box>,
    )
    for (const option of PAGE_BACKGROUND_OPTIONS) {
      await expect.element(screen.getByRole('button', { name: `Background: ${option.label}` })).toBeInTheDocument()
    }
    // The current value is the pressed swatch; picking another reports its key.
    const none = document.querySelector(`[aria-label="Background: ${PAGE_BACKGROUND_OPTIONS[0].label}"]`)
    expect(none.getAttribute('aria-pressed')).toBe('true')
    await screen.getByRole('button', { name: 'Background: Confetti' }).click()
    expect(onChange).toHaveBeenCalledWith('confetti')
  })
})
