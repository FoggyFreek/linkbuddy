import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import AppearancePanel from '../components/AppearancePanel.jsx'
import { DEFAULT_PAGE_BACKGROUND } from '../../../../shared/features/appearance/pageBackgrounds.js'
import { DEFAULT_PAGE_FONT } from '../../../../shared/features/appearance/pageFonts.js'

// AppearancePanel's theme toggle drives layout.theme (the server editor layout
// parses it, and public-page resolution falls back to it) — these tests exercise the control
// standalone, without booting the whole Editor (session, autosave, tabs).
async function renderPanel(props = {}) {
  const handlers = {
    background: DEFAULT_PAGE_BACKGROUND,
    schemeMode: 'light',
    onSetBackground: vi.fn(),
    showBanner: false,
    onSetShowBanner: vi.fn(),
    theme: null,
    autoTheme: 'light',
    onSetTheme: vi.fn(),
    font: DEFAULT_PAGE_FONT,
    onSetFont: vi.fn(),
    themeVariant: null,
    onSetThemeVariant: vi.fn(),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <AppearancePanel {...handlers} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('AppearancePanel theme toggle', () => {
  it('selects Auto by default when the layout carries no explicit theme', async () => {
    const { screen } = await renderPanel({ theme: null })
    const auto = screen.getByRole('button', { name: 'Auto' })
    await expect.element(auto).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects the explicit choice when the layout has one', async () => {
    const { screen } = await renderPanel({ theme: 'dark' })
    await expect.element(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSetTheme with the raw key for an explicit pick, and null for Auto', async () => {
    const { screen, handlers } = await renderPanel({ theme: null })

    await screen.getByRole('button', { name: 'Dark' }).click()
    expect(handlers.onSetTheme).toHaveBeenCalledWith('dark')

    await screen.getByRole('button', { name: 'Light' }).click()
    expect(handlers.onSetTheme).toHaveBeenCalledWith('light')
  })

  it('ignores a click on the already-selected button (exclusive group, no deselect)', async () => {
    const { screen, handlers } = await renderPanel({ theme: 'dark' })
    await screen.getByRole('button', { name: 'Dark' }).click()
    expect(handlers.onSetTheme).not.toHaveBeenCalled()
  })
})

describe('AppearancePanel font picker', () => {
  it('marks the layout\'s current font as the pressed swatch', async () => {
    const { screen } = await renderPanel({ font: 'oswald' })
    await expect.element(screen.getByRole('button', { name: 'Font: Oswald' })).toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('button', { name: 'Font: System' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSetFont with the picked key', async () => {
    const { screen, handlers } = await renderPanel({ font: DEFAULT_PAGE_FONT })
    await screen.getByRole('button', { name: 'Font: Bebas Neue' }).click()
    expect(handlers.onSetFont).toHaveBeenCalledWith('bebas')
  })

  it('previews each swatch in the face it selects', async () => {
    const { screen } = await renderPanel({ font: DEFAULT_PAGE_FONT })
    const sample = screen.getByRole('button', { name: 'Font: Bebas Neue' }).element().querySelector('[data-sample]')
    expect(getComputedStyle(sample).fontFamily).toContain('Bebas Neue')
  })
})

// The three palettes offered inside the chosen colour scheme. One key is stored
// per page, so the picker always shows the variants of the scheme the page will
// actually render in (schemeMode) and falls back to that scheme's default.
describe('AppearancePanel theme variants', () => {
  it('offers the three variants of the page scheme', async () => {
    const { screen } = await renderPanel({ schemeMode: 'light' })
    for (const label of ['Paper', 'Sky', 'Sand']) {
      await expect.element(screen.getByRole('button', { name: `Theme colours: ${label}` })).toBeInTheDocument()
    }
    expect(document.body.querySelectorAll('[data-theme-variant]')).toHaveLength(3)
  })

  it('offers the dark variants when the page renders dark', async () => {
    const { screen } = await renderPanel({ schemeMode: 'dark', theme: 'dark' })
    for (const label of ['Midnight', 'Carbon', 'Forest']) {
      await expect.element(screen.getByRole('button', { name: `Theme colours: ${label}` })).toBeInTheDocument()
    }
  })

  it('marks the stored variant as the pressed swatch', async () => {
    const { screen } = await renderPanel({ schemeMode: 'light', themeVariant: 'light-sand' })
    await expect.element(screen.getByRole('button', { name: 'Theme colours: Sand' })).toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('button', { name: 'Theme colours: Paper' })).toHaveAttribute('aria-pressed', 'false')
  })

  it("presses the scheme's default when the stored variant belongs to the other scheme", async () => {
    const { screen } = await renderPanel({ schemeMode: 'light', themeVariant: 'dark-forest' })
    await expect.element(screen.getByRole('button', { name: 'Theme colours: Paper' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onSetThemeVariant with the picked key', async () => {
    const { screen, handlers } = await renderPanel({ schemeMode: 'dark', theme: 'dark' })
    await screen.getByRole('button', { name: 'Theme colours: Forest' }).click()
    expect(handlers.onSetThemeVariant).toHaveBeenCalledWith('dark-forest')
  })

  it('previews each swatch in the palette it selects', async () => {
    const { screen } = await renderPanel({ schemeMode: 'dark', theme: 'dark' })
    const swatch = screen.getByRole('button', { name: 'Theme colours: Forest' }).element().querySelector('[data-theme-variant]')
    // The variant's own canvas and card colours, not the editor's dark palette.
    expect(getComputedStyle(swatch).backgroundColor).toBe('rgb(15, 31, 24)')
    expect(getComputedStyle(swatch.querySelector('[data-card]')).backgroundColor).toBe('rgb(38, 64, 52)')
  })
})

// The background swatches preview the page, so they have to show the palette the
// page is on: the plain `none` canvas and the theme-coloured tile patterns both
// follow the chosen variant.
describe('AppearancePanel background swatches follow the theme variant', () => {
  const swatchScope = (screen, label) =>
    screen.getByRole('button', { name: `Background: ${label}` }).element().querySelector('[data-theme]')

  it('paints the plain canvas swatch in the variant canvas', async () => {
    const { screen } = await renderPanel({ schemeMode: 'dark', theme: 'dark', themeVariant: 'dark-forest' })
    expect(getComputedStyle(swatchScope(screen, 'None')).backgroundColor).toBe('rgb(15, 31, 24)')
  })

  it('draws the tile swatches in the variant canvas and ink', async () => {
    const { screen } = await renderPanel({ schemeMode: 'dark', theme: 'dark', themeVariant: 'dark-forest', background: 'squares' })
    const scope = swatchScope(screen, 'Squares')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(15, 31, 24)')
    expect(decodeURIComponent(getComputedStyle(scope).backgroundImage)).toContain('fill="#eef5f0"')
  })

  it('leaves a scene swatch on its own artwork palette', async () => {
    const { screen } = await renderPanel({ schemeMode: 'dark', theme: 'dark', themeVariant: 'dark-forest', background: 'blobs' })
    expect(getComputedStyle(swatchScope(screen, 'Blobs')).backgroundColor).not.toBe('rgb(15, 31, 24)')
  })
})
