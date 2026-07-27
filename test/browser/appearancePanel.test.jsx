import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'
import AppearancePanel from '../../src/editor/AppearancePanel.jsx'
import { DEFAULT_PAGE_BACKGROUND } from '../../shared/pageBackgrounds.js'

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
