import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import theme from '../../../lib/theme.js'
import PreviewContent from '../../../components/PreviewContent.jsx'

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

const albumPage = {
  ...page,
  release: {
    title: 'Harbour Lights', artist: 'Neon Harbour', coverUrl: COVER,
    tracks: [{ number: 1, title: 'Opener' }, { number: 2, title: 'Tidal' }, { number: null, title: 'Hidden Bonus' }],
  },
}

afterEach(cleanup)

function renderWide(content = page) {
  // The 1000px wrapper makes the containerType box >=840px wide.
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Box sx={{ width: 1000 }}>
        <PreviewContent page={content} />
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
    expect(Number(getComputedStyle(cover.parentElement).zIndex)).toBeGreaterThan(Number(bd.zIndex))

    // The backdrop is scaled up so its blurred edges over-fill the pane instead
    // of leaving a soft gap; the pane clips that overflow.
    expect(bd.transform).not.toBe('none')
    expect(getComputedStyle(pane).overflow).toBe('hidden')
  })

  it('shows an album tracklist over the cover on hover', async () => {
    const screen = await renderWide(albumPage)
    const tracklist = screen.getByRole('list', { name: 'Tracklist' })
    await expect.element(tracklist).toBeInTheDocument()
    const items = [...tracklist.element().querySelectorAll('li')].map((li) => li.textContent)
    expect(items).toEqual(['1Opener', '2Tidal', 'Hidden Bonus'])

    // Over the cover, invisible until the cover is hovered.
    const frame = tracklist.element().parentElement
    const overlay = tracklist.element().getBoundingClientRect()
    const art = frame.querySelector('img').getBoundingClientRect()
    expect([overlay.width, overlay.height]).toEqual([art.width, art.height])
    expect(getComputedStyle(tracklist.element()).opacity).toBe('0')
    await userEvent.hover(frame)
    await expect.poll(() => getComputedStyle(tracklist.element()).opacity).toBe('1')
  })

  it('leaves an unnumbered track unnumbered rather than guessing from its position', async () => {
    const tracks = [{ number: 1, title: 'One' }, { number: 2, title: 'Two' }, { number: 4, title: 'Four' }, { number: null, title: 'Bonus' }]
    const screen = await renderWide({ ...albumPage, release: { ...albumPage.release, tracks } })
    const list = screen.getByRole('list', { name: 'Tracklist' })
    await expect.element(list).toBeInTheDocument()
    expect([...list.element().querySelectorAll('li')].map((li) => li.textContent)).toEqual(['1One', '2Two', '4Four', 'Bonus'])
  })

  it('centres a short tracklist vertically over the cover', async () => {
    const screen = await renderWide(albumPage)
    const list = screen.getByRole('list', { name: 'Tracklist' }).element()
    await expect.poll(() => list.getBoundingClientRect().height).toBeGreaterThan(0)
    const box = list.getBoundingClientRect()
    const items = list.querySelectorAll('li')
    const above = items[0].getBoundingClientRect().top - box.top
    const below = box.bottom - items[items.length - 1].getBoundingClientRect().bottom
    expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
  })

  it('centres the tracklist horizontally as one block, numbers kept in line', async () => {
    const screen = await renderWide(albumPage)
    const list = screen.getByRole('list', { name: 'Tracklist' }).element()
    await expect.poll(() => list.getBoundingClientRect().width).toBeGreaterThan(0)
    const box = list.getBoundingClientRect()
    const rows = [...list.querySelectorAll('li')].map((li) => li.getBoundingClientRect())
    expect(new Set(rows.map((row) => Math.round(row.left))).size).toBe(1)
    const left = Math.min(...rows.map((row) => row.left)) - box.left
    const right = box.right - Math.max(...rows.map((row) => row.right))
    expect(left).toBeGreaterThan(20)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
  })

  it('keeps a long tracklist scrollable from its first track', async () => {
    const tracks = Array.from({ length: 60 }, (_, i) => ({ number: i + 1, title: `Track ${i + 1}` }))
    const screen = await renderWide({ ...albumPage, release: { ...albumPage.release, tracks } })
    const list = screen.getByRole('list', { name: 'Tracklist' }).element()
    await expect.poll(() => list.scrollHeight).toBeGreaterThan(list.clientHeight)
    expect(list.scrollTop).toBe(0)
    expect(list.querySelector('li').getBoundingClientRect().top).toBeGreaterThanOrEqual(list.getBoundingClientRect().top)
  })

  it('reveals the tracklist to keyboard users on focus', async () => {
    const screen = await renderWide(albumPage)
    const tracklist = screen.getByRole('list', { name: 'Tracklist' })
    tracklist.element().focus()
    await expect.poll(() => getComputedStyle(tracklist.element()).opacity).toBe('1')
  })

  it('shows no tracklist for a song release', async () => {
    const screen = await renderWide()
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Midnight Signal' })).toBeInTheDocument()
    expect(document.querySelector('[aria-label="Tracklist"]')).toBeNull()
  })
})
