import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import theme from '../../src/theme.js'
import ColorSchemeScope from '../../src/ColorSchemeScope.jsx'
import ShareButton from '../../src/ShareButton.jsx'

// ColorSchemeScope is the single mechanism behind the public page and the editor
// preview. These tests pin the behaviour the refactor depends on: a subtree can
// hold its own scheme independent of the document, two scopes can disagree at
// once (a dark editor showing a light preview), and portaled surfaces opened
// inside a scope inherit its scheme instead of escaping to the document.

function renderApp(node) {
  // defaultMode light => the document (root) scheme is light throughout.
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

describe('ColorSchemeScope', () => {
  it('forces its subtree to the given scheme, independent of the document', async () => {
    const screen = await renderApp(
      <ColorSchemeScope mode="dark" data-testid="scope">
        <Card data-testid="card"><Typography variant="h1">Neon</Typography></Card>
      </ColorSchemeScope>,
    )
    await expect.element(screen.getByTestId('scope')).toBeInTheDocument()

    // The document root stays light; only the scope is dark.
    expect(document.documentElement.dataset.theme).not.toBe('dark')
    const scope = document.querySelector('[data-testid="scope"]')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(38, 55, 77)') // #26374d canvas
    const card = document.querySelector('[data-testid="card"]')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)') // #2f4257 paper
    // Inherited text follows the dark scheme with no global colour rule needed —
    // the scope sets `color` itself.
    const h1 = card.querySelector('.MuiTypography-h1')
    expect(getComputedStyle(h1).color).toBe('rgb(242, 245, 249)') // #f2f5f9
  })

  it('renders two disagreeing scopes at once (editor light, preview dark)', async () => {
    const screen = await renderApp(
      <>
        <ColorSchemeScope mode="light" data-testid="light"><Card data-testid="lc">a</Card></ColorSchemeScope>
        <ColorSchemeScope mode="dark" data-testid="dark"><Card data-testid="dc">b</Card></ColorSchemeScope>
      </>,
    )
    await expect.element(screen.getByTestId('light')).toBeInTheDocument()
    expect(getComputedStyle(document.querySelector('[data-testid="lc"]')).backgroundColor).toBe('rgb(255, 255, 255)')
    expect(getComputedStyle(document.querySelector('[data-testid="dc"]')).backgroundColor).toBe('rgb(47, 66, 87)')
  })

  it('mounts a descendant portal (share menu) inside the scope so it inherits the scheme', async () => {
    const screen = await renderApp(
      <ColorSchemeScope mode="dark" data-testid="scope">
        <ShareButton variant="inline" url="https://x.example" title="X" />
      </ColorSchemeScope>,
    )
    await screen.getByRole('button', { name: 'Share this page' }).click()

    const scope = document.querySelector('[data-testid="scope"]')
    await vi.waitFor(() => {
      // The menu portals into the scope node, not document.body, so its paper
      // resolves to the dark scheme's paper colour.
      const menuPaper = scope.querySelector('.MuiMenu-paper')
      expect(menuPaper).toBeTruthy()
      expect(getComputedStyle(menuPaper).backgroundColor).toBe('rgb(47, 66, 87)')
    })
  })
})
