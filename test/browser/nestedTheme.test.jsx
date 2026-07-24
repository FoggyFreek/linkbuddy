import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'
import WidgetStack from '../../src/WidgetStack.jsx'

// Reproduces the editor preview: the colour scheme is forced on a NESTED
// container (`<div class="public-page" data-theme="dark">`) while the document
// root stays light. The CSS-variable bridge must recompute both the surface
// colours and the inherited text colour against the container's own scheme —
// otherwise dark previews render with light surfaces or unreadable dark text.
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
      <div className="public-page" data-theme={scheme} data-testid="frame">
        <WidgetStack page={page} />
      </div>
    </ThemeProvider>,
  )
}

describe('Nested theme forcing (editor preview scenario)', () => {
  it('keeps light surfaces and dark text when a nested container forces light', async () => {
    const screen = await renderNested('light')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()

    // Root stays light; the forced-light container matches it.
    expect(document.documentElement.dataset.theme).not.toBe('dark')
    const card = document.querySelector('[data-testid="frame"] .card')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)')
    const name = document.querySelector('[data-testid="frame"] .band-name')
    expect(getComputedStyle(name).color).toBe('rgb(23, 24, 28)')
  })

  it('flips surfaces AND text to dark when a nested container forces dark on a light root', async () => {
    const screen = await renderNested('dark')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()

    // The document root is NOT dark — only the nested container is forced.
    expect(document.documentElement.dataset.theme).not.toBe('dark')

    const card = document.querySelector('[data-testid="frame"] .card')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)')

    // The regression: inherited text colour must recompute to the dark scheme's
    // light text (#f2f5f9), not stay the root's dark text.
    const name = document.querySelector('[data-testid="frame"] .band-name')
    expect(getComputedStyle(name).color).toBe('rgb(242, 245, 249)')
  })
})
