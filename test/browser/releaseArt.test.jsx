import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import theme from '../../src/lib/theme.js'
import PageContent from '../../src/components/PageContent.jsx'

// Smart-link (release) pages use a two-pane desktop layout where the album cover
// sits on a full-height, blurred copy of itself (ReleaseArt in features/smart-link). The
// backdrop only appears at the container breakpoint, so this renders inside a
// wide (>=840px) container to engage the `@container (min-width:840px)` branch.
// 1x1 transparent PNG so both <img>s have a valid, loadable src.
const COVER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const page = {
  band: { name: 'Neon Harbour', slug: 'neon-harbour', socials: {} },
  release: { title: 'Midnight Signal', artist: 'Neon Harbour', coverUrl: COVER },
  sections: [
    { id: 's1', widgets: [{ id: 'w1', type: 'platforms', title: 'Listen', platforms: [{ id: 'spotify', url: '#' }] }] },
  ],
}

function renderWide() {
  // The 1000px wrapper makes the containerType box >=840px wide.
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Box sx={{ width: 1000 }}>
        <PageContent page={page} />
      </Box>
    </ThemeProvider>,
  )
}

describe('ReleaseArt (smart-link desktop backdrop)', () => {
  it('renders the cover on a full-height blurred copy of itself at desktop width', async () => {
    const screen = await renderWide()
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Midnight Signal' })).toBeInTheDocument()

    // Two copies of the same album cover: the blurred backdrop and the cover.
    const imgs = [...document.querySelectorAll(`img[src="${COVER}"]`)]
    expect(imgs).toHaveLength(2)
    const backdrop = imgs.find((i) => i.getAttribute('aria-hidden') === 'true')
    const cover = imgs.find((i) => i.getAttribute('aria-hidden') !== 'true')
    expect(backdrop).toBeTruthy()
    expect(cover).toBeTruthy()

    const bd = getComputedStyle(backdrop)
    expect(bd.display).toBe('block') // hidden on mobile, shown on desktop
    expect(bd.position).toBe('absolute')
    expect(bd.objectFit).toBe('cover')
    expect(bd.filter).toContain('blur(42px)')

    // Full height: the backdrop's layout box fills the art pane (inset:0), and
    // the pane stretches to at least the viewport height (row minHeight:100vh +
    // alignItems:stretch). offsetHeight ignores the scale(1.25) visual overflow.
    const pane = backdrop.parentElement
    expect(backdrop.offsetHeight).toBe(pane.offsetHeight)
    expect(backdrop.offsetWidth).toBe(pane.offsetWidth)
    expect(pane.offsetHeight).toBeGreaterThanOrEqual(window.innerHeight - 1)

    // The real cover sits ON TOP of the blurred backdrop.
    expect(Number(getComputedStyle(cover).zIndex)).toBeGreaterThan(Number(bd.zIndex))

    // The backdrop is scaled up so its blurred edges over-fill the pane instead
    // of leaving a soft gap; the pane clips that overflow.
    expect(bd.transform).not.toBe('none')
    expect(getComputedStyle(pane).overflow).toBe('hidden')
  })
})
