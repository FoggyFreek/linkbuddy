import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Typography from '@mui/material/Typography'
import theme from '../../lib/theme.js'
import AppShell from '../AppShell.jsx'

// The application chrome (editor, privacy notice) is a single vertical paper
// column centred on a darker backdrop. These tests pin the two colours that
// make that read — the body canvas behind the column and the column's own
// surface — in both colour schemes, plus the column geometry.

function renderApp(node, mode) {
  return render(
    <ThemeProvider theme={theme} defaultMode={mode}>
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

describe('AppShell', () => {
  it('sits as a centred paper column on a darker canvas in light mode', async () => {
    const screen = await renderApp(
      <AppShell data-testid="shell"><Typography>Build</Typography></AppShell>,
      'light',
    )
    await expect.element(screen.getByTestId('shell')).toBeInTheDocument()

    // The page backdrop is the canvas token, darker than the column itself.
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(220, 222, 226)') // #dcdee2

    const shell = document.querySelector('[data-testid="shell"]')
    expect(shell.classList.contains('MuiPaper-root')).toBe(true)
    expect(getComputedStyle(shell).backgroundColor).toBe('rgb(236, 238, 242)') // #eceef2
    // A vertical column: full viewport height, centred, bounded width.
    const styles = getComputedStyle(shell)
    expect(styles.marginLeft).toBe(styles.marginRight)
    expect(shell.getBoundingClientRect().height).toBeGreaterThanOrEqual(window.innerHeight)
  })

  it('keeps the same canvas/column contrast in dark mode', async () => {
    const screen = await renderApp(
      <AppShell data-testid="shell"><Typography>Build</Typography></AppShell>,
      'dark',
    )
    await expect.element(screen.getByTestId('shell')).toBeInTheDocument()

    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(22, 39, 61)') // #16273d
    const shell = document.querySelector('[data-testid="shell"]')
    expect(getComputedStyle(shell).backgroundColor).toBe('rgb(38, 55, 77)') // #26374d
  })

  it('renders its children', async () => {
    const screen = await renderApp(<AppShell><Typography>Appearance</Typography></AppShell>, 'light')
    await expect.element(screen.getByText('Appearance')).toBeInTheDocument()
  })
})
