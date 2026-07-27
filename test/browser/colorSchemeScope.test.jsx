import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import theme from '../../src/theme.js'
import ColorSchemeScope from '../../src/ColorSchemeScope.jsx'
import ShareButton from '../../src/ShareButton.jsx'
import { pageBackgroundSx } from '../../src/pageBackgrounds.js'

// ColorSchemeScope is the single mechanism behind the public page and the editor
// preview. These tests pin the behaviour the refactor depends on: a subtree can
// hold its own scheme independent of the document, two scopes can disagree at
// once (a dark editor showing a light preview), and portaled surfaces opened
// inside a scope inherit its scheme instead of escaping to the document.

function renderApp(node, docMode = 'light') {
  // defaultMode light => the document (root) scheme is light throughout.
  return render(
    <ThemeProvider theme={theme} defaultMode={docMode}>
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
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(22, 39, 61)') // #16273d page canvas
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

  // Last, because it puts the document itself on dark. `theme.applyStyles` is
  // the second half of scoping: palette *variables* inherit from the nearest
  // scope on their own, but applyStyles' selector (`*:where([data-theme="dark"])
  // &`) matches on ANY dark ancestor — so a dark document used to reach inside a
  // light scope, which is exactly how the light band logo went missing whenever
  // the editor (or a visitor's stored mode, via the anti-flash script in
  // index.html) had <html> on dark.
  it('resolves applyStyles and page backgrounds against the scope, not an outer dark document', async () => {
    const marker = (id) => (
      <Box data-testid={id} sx={(t) => ({ color: 'rgb(1, 2, 3)', ...t.applyStyles('dark', { color: 'rgb(9, 9, 9)' }) })} />
    )
    const screen = await renderApp(
      <>
        <ColorSchemeScope mode="light" data-testid="l" sx={pageBackgroundSx('blobs')}>{marker('lm')}</ColorSchemeScope>
        <ColorSchemeScope mode="dark" data-testid="d" sx={pageBackgroundSx('blobs')}>{marker('dm')}</ColorSchemeScope>
      </>,
      'dark',
    )
    await expect.element(screen.getByTestId('l')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')

    const styleOf = (id) => getComputedStyle(document.querySelector(`[data-testid="${id}"]`))
    // Inside the light scope the dark branch does not apply; inside the dark one it does.
    expect(styleOf('lm').color).toBe('rgb(1, 2, 3)')
    expect(styleOf('dm').color).toBe('rgb(9, 9, 9)')
    // Same for the background artwork, which lands on the scope element itself.
    expect(styleOf('l').backgroundColor).toBe('rgb(31, 75, 216)') // #1f4bd8, the light blobs canvas
    expect(styleOf('d').backgroundColor).not.toBe(styleOf('l').backgroundColor)
    expect(styleOf('d').backgroundImage).not.toBe(styleOf('l').backgroundImage)
  })
})
