import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { page as browser } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import theme from '../theme.js'
import ColorSchemeScope from '../../components/ColorSchemeScope.jsx'
import { PAGE_BACKGROUND_OPTIONS, pageBackgroundSx } from '../pageBackgrounds.js'
import BackgroundPicker from '../../features/editor/components/BackgroundPicker.jsx'
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../../shared/features/appearance/pageBackgrounds.js'

// The page backgrounds are CSS background-images rather than DOM nodes, so these
// tests assert the computed style of the element the artwork is applied to: that
// a chosen background paints, that `none` leaves the theme's plain canvas, and
// that each scene has its own artwork per colour scheme.
const state = { page: null }
vi.mock('../api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../../app/routes/BandPage.jsx')

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
  const screen = await renderApp(<BandPage slug="testers" />)
  await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()
  // The scope wrapping the whole page — the element the background is painted
  // on. Searched from <body>, since MUI also puts data-theme on <html>.
  return document.body.querySelector('[data-theme="light"]')
}

afterEach(cleanup)

describe('page backgrounds on the public page', () => {
  // The public routes drop the artwork below `sm` (app/__tests__/mobileBleed.test.jsx),
  // so assert it at a width that shows it.
  beforeAll(async () => { await browser.viewport(1000, 900) })

  it('paints the chosen background artwork behind the page', async () => {
    const scope = await renderPublicPage('blobs')
    const { backgroundImage, backgroundColor, backgroundSize } = getComputedStyle(scope)
    expect(backgroundImage).toContain('data:image/svg+xml')
    expect(backgroundSize).toBe('cover')
    expect(backgroundColor).toBe('rgb(31, 75, 216)') // #1f4bd8, the blobs canvas
  })

  it('paints the sand dunes with a shadow under every layer, per colour scheme', async () => {
    const scope = await renderPublicPage('sand')
    const { backgroundImage, backgroundColor } = getComputedStyle(scope)
    expect(backgroundColor).toBe('rgb(250, 244, 227)') // #faf4e3, the sand canvas
    const svg = decodeURIComponent(backgroundImage)
    const layers = svg.match(/<path filter="url\(#sandShadow\)"/g)
    expect(layers).toHaveLength(8)
    expect(svg).toContain('<feDropShadow')
    // Each ridge is its own step of the ramp, palest at the back.
    const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map(([, fill]) => fill)
    expect(new Set(fills).size).toBe(fills.length)
  })

  it('sweeps the rainbow vortex out of the top-left corner', async () => {
    const scope = await renderPublicPage('rainbow')
    const { backgroundImage, backgroundColor } = getComputedStyle(scope)
    expect(backgroundColor).toBe('rgb(255, 157, 0)') // #ff9d00, the widest ring
    const svg = decodeURIComponent(backgroundImage)
    const rings = [...svg.matchAll(/<circle fill="(#[0-9a-fA-F]{6})" cx="0" cy="0" r="(\d+)"/g)]
    expect(rings).toHaveLength(18)
    // Painted widest first, so every ring stays visible inside the one behind it.
    const radii = rings.map(([, , r]) => Number(r))
    expect(radii).toEqual([...radii].sort((a, b) => b - a))
    expect(new Set(rings.map(([, fill]) => fill)).size).toBe(18)
  })

  it('fans the sunburst rays out of one glowing centre', async () => {
    const scope = await renderPublicPage('sunburst')
    const { backgroundImage, backgroundColor } = getComputedStyle(scope)
    expect(backgroundColor).toBe('rgb(255, 255, 255)') // #ffffff, the glow at the centre
    const svg = decodeURIComponent(backgroundImage)
    // A wash and the rays, each its own radial gradient around the same centre.
    const centres = [...svg.matchAll(/<radialGradient [^>]*cx="(\d+)" cy="(\d+)"/g)]
    expect(centres).toHaveLength(2)
    expect(new Set(centres.map(([, cx, cy]) => `${cx},${cy}`)).size).toBe(1)
    expect(svg).toContain('<path fill="url(#sunRays)"')
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
  it('offers the sunburst colourways on its own swatch, once it is chosen', async () => {
    const onChange = vi.fn()
    const screen = await renderApp(<Box><BackgroundPicker value="none" mode="light" onChange={onChange} /></Box>)
    // Colourways are a property of the chosen scene, not extra swatches.
    expect(PAGE_BACKGROUND_OPTIONS.map((option) => option.key)).not.toContain('sunburst-ember')
    expect(document.querySelector('[aria-label="Colours: Ember"]')).toBeNull()

    await screen.getByRole('button', { name: 'Background: Sunburst' }).click()
    expect(onChange).toHaveBeenLastCalledWith('sunburst')

    const screen2 = await renderApp(<Box><BackgroundPicker value="sunburst" mode="light" onChange={onChange} /></Box>)
    for (const label of ['Ice', 'Ember', 'Lagoon']) {
      await expect.element(screen2.getByRole('button', { name: `Colours: ${label}` })).toBeInTheDocument()
    }
    const ice = document.querySelector('[aria-label="Colours: Ice"]')
    expect(ice.getAttribute('aria-pressed')).toBe('true')
    // Each dot is the colourway's own palette, one colour per column.
    expect([...ice.children].map((column) => getComputedStyle(column).backgroundColor))
      .toEqual(['rgb(255, 255, 255)', 'rgb(0, 238, 255)', 'rgb(0, 255, 255)'])
    // Only the scene that has colourways shows them.
    expect(document.querySelectorAll('[aria-label^="Colours: "]')).toHaveLength(3)

    await screen2.getByRole('button', { name: 'Colours: Ember' }).click()
    expect(onChange).toHaveBeenLastCalledWith('sunburst-ember')
  })

  it.each([
    ['Glow', ['Blossom', 'Citrus', 'Mist']],
    ['Sand', ['Dune', 'Slate', 'Rose']],
    ['Rainbow', ['Sunset', 'Aurora', 'Ash']],
  ])('offers three colourways on the %s swatch', async (scene, labels) => {
    const onChange = vi.fn()
    const key = scene.toLowerCase()
    const screen = await renderApp(<Box><BackgroundPicker value={key} mode="light" onChange={onChange} /></Box>)
    for (const label of labels) {
      await expect.element(screen.getByRole('button', { name: `Colours: ${label}` })).toBeInTheDocument()
    }
    expect(document.querySelectorAll('[aria-label^="Colours: "]')).toHaveLength(labels.length)
    await screen.getByRole('button', { name: `Colours: ${labels[2]}` }).click()
    expect(onChange).toHaveBeenLastCalledWith(`${key}-${labels[2].toLowerCase()}`)
  })

  it('samples a long ramp down to a legible dot, keeping both ends', async () => {
    await renderApp(<Box><BackgroundPicker value="sand" mode="light" onChange={vi.fn()} /></Box>)
    const columns = [...document.querySelector('[aria-label="Colours: Dune"]').children]
      .map((column) => getComputedStyle(column).backgroundColor)
    // Eight ridge colours, five columns: the ramp's own ends still bound it.
    expect(columns).toHaveLength(5)
    expect(columns[0]).toBe('rgb(246, 235, 207)') // #f6ebcf, the palest ridge
    expect(columns[4]).toBe('rgb(112, 82, 54)') // #705236, the deepest
  })

  it('keeps the sunburst swatch chosen, and painted, while a colourway is picked', async () => {
    const screen = await renderApp(
      <Box>
        <BackgroundPicker value="sunburst-ember" mode="light" onChange={vi.fn()} />
        <ColorSchemeScope mode="light" data-testid="ember-art" sx={pageBackgroundSx('sunburst-ember')} />
        <ColorSchemeScope mode="light" data-testid="ice-art" sx={pageBackgroundSx('sunburst')} />
      </Box>,
    )
    const swatch = await screen.getByRole('button', { name: 'Background: Sunburst' }).element()
    expect(swatch.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('[aria-label="Colours: Ember"]').getAttribute('aria-pressed')).toBe('true')
    // The swatch previews the picked colourway, not the scene's default one.
    const painted = getComputedStyle(swatch.querySelector('[data-theme]')).backgroundImage
    expect(painted).toBe(getComputedStyle(document.querySelector('[data-testid="ember-art"]')).backgroundImage)
    expect(painted).not.toBe(getComputedStyle(document.querySelector('[data-testid="ice-art"]')).backgroundImage)
  })

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
