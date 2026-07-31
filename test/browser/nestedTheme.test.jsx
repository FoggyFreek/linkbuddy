import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import theme from '../../src/lib/theme.js'
import PreviewContent from '../../src/components/PreviewContent.jsx'

// Reproduces the editor preview: the colour scheme is forced on a NESTED
// container (a Box carrying data-theme + its own text colour) while the document
// root stays light — exactly what Editor.jsx renders around PreviewContent. MUI's
// components read theme.vars, so their surfaces recompute against the container's
// scheme automatically; the container restates `color` so plain inherited text
// (the Typography labels) follows the same scheme.
const page = {
  band: { name: 'Neon Harbour', bio: 'Synth-pop.', slug: 'neon-harbour', socials: {} },
  sections: [
    { id: 's1', title: 'Latest', widgets: [
      { id: 'w1', type: 'song', title: 'Midnight Signal', artist: 'Neon Harbour', coverUrl: null, links: [{ url: '#', label: 'Listen' }] },
    ] },
  ],
}

function renderNested(scheme) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Box data-theme={scheme} data-testid="frame" sx={{ color: 'text.primary', bgcolor: 'background.default' }}>
        <PreviewContent page={page} />
      </Box>
    </ThemeProvider>,
  )
}

describe('Nested theme forcing (editor preview scenario)', () => {
  it('keeps light surfaces and dark text when a nested container forces light', async () => {
    const screen = await renderNested('light')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()

    // Root stays light; the forced-light container matches it.
    expect(document.documentElement.dataset.theme).not.toBe('dark')
    const card = document.querySelector('[data-testid="frame"] section .MuiCard-root')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)')
    const name = document.querySelector('[data-testid="frame"] .MuiTypography-h1')
    expect(getComputedStyle(name).color).toBe('rgb(23, 24, 28)')
  })

  it('flips surfaces AND text to dark when a nested container forces dark on a light root', async () => {
    const screen = await renderNested('dark')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()

    // The document root is NOT dark — only the nested container is forced.
    expect(document.documentElement.dataset.theme).not.toBe('dark')

    // MUI Card reads var(--mui-palette-background-paper), which resolves to the
    // dark paper colour under the forced container.
    const card = document.querySelector('[data-testid="frame"] section .MuiCard-root')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)')

    // Inherited text colour recomputes to the dark scheme's light text (#f2f5f9),
    // not the root's dark text.
    const name = document.querySelector('[data-testid="frame"] .MuiTypography-h1')
    expect(getComputedStyle(name).color).toBe('rgb(242, 245, 249)')
  })
})
