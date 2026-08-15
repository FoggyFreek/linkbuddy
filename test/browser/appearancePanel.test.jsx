import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'
import AppearancePanel from '../../src/features/editor/components/AppearancePanel.jsx'
import { DEFAULT_PAGE_BACKGROUND } from '../../shared/pageBackgrounds.js'
import { DEFAULT_PAGE_FONT } from '../../shared/pageFonts.js'

// AppearancePanel's theme toggle drives layout.theme (server/layout.js parses
// it, server/resolve.js falls back to it) — these tests exercise the control
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
