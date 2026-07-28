import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'
import ColorSchemeScope from '../../src/components/ColorSchemeScope.jsx'
import PageContent from '../../src/components/PageContent.jsx'

// Embed widgets carry the server-derived descriptor; `display` only picks the
// shape of the modal the player opens in.
const AUDIO = {
  id: 'w1', type: 'embed', url: 'https://open.spotify.com/track/x', title: 'Midnight Signal', description: 'Single',
  imageUrl: null, embed: { type: 'spotify', display: 'inline', src: 'https://open.spotify.com/embed/track/x', height: 152 },
}
const VIDEO = {
  id: 'w2', type: 'embed', url: 'https://youtu.be/x', title: 'Live session', description: null, imageUrl: null,
  embed: { type: 'youtube', display: 'overlay', src: 'https://www.youtube-nocookie.com/embed/x?autoplay=1' },
}

function renderStack(widget, { mode = 'light', onLinkClick } = {}) {
  const page = { band: { name: 'The Testers', slug: 'testers', theme: mode }, sections: [{ id: 's1', widgets: [widget] }] }
  // vitest-browser-react's render resolves asynchronously (act flush).
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <ColorSchemeScope mode={mode}>
        <PageContent page={page} {...(onLinkClick ? { onLinkClick } : {})} />
      </ColorSchemeScope>
    </ThemeProvider>,
  )
}

afterEach(cleanup)

describe('embed players open in a closable modal overlay', () => {
  it('mounts no third-party iframe until the visitor clicks (privacy contract)', async () => {
    const screen = await renderStack(AUDIO)
    await expect.element(screen.getByText('Midnight Signal')).toBeInTheDocument()
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  // The audio facade is the whole row; the video facade is the artwork button.
  const openFacade = (screen, widget) =>
    (widget === VIDEO ? screen.getByRole('button').nth(0) : screen.getByText(widget.title)).click()

  for (const [kind, widget] of [['audio', AUDIO], ['video', VIDEO]]) {
    it(`opens the ${kind} player in a dialog and closing it unmounts the iframe`, async () => {
      const clicks = []
      const screen = await renderStack(widget, { onLinkClick: (t) => clicks.push(t) })
      await expect.element(screen.getByText(widget.title)).toBeInTheDocument()

      await openFacade(screen, widget)
      const dialog = screen.getByRole('dialog')
      await expect.element(dialog).toBeInTheDocument()
      expect(clicks).toEqual([`embed:${widget.embed.type}`])

      const iframe = dialog.element().querySelector('iframe')
      expect(iframe.src).toBe(widget.embed.src)
      // The paper hugs the player (plus its close/open chrome) instead of
      // stretching to the viewport.
      const paper = dialog.element().querySelector('.MuiPaper-root') || dialog.element()
      const paperHeight = paper.getBoundingClientRect().height
      expect(paperHeight).toBeLessThanOrEqual(iframe.getBoundingClientRect().height + 140)
      expect(paperHeight).toBeLessThan(window.innerHeight)

      // Footer escape hatch: the original link, in a new window.
      const openLink = dialog.element().querySelector('a[target="_blank"]')
      expect(openLink.href).toBe(widget.url)
      expect(openLink.rel).toContain('noopener')

      await screen.getByRole('button', { name: 'Close player' }).click()
      await vi.waitFor(() => {
        expect(document.querySelectorAll('iframe')).toHaveLength(0)
      })
    })
  }

  it('portals the dialog inside the page scope so it inherits the page scheme', async () => {
    const screen = await renderStack(VIDEO, { mode: 'dark' })
    await expect.element(screen.getByText('Live session')).toBeInTheDocument()
    await openFacade(screen, VIDEO)

    const dialog = (await screen.getByRole('dialog')).element()
    const scope = dialog.closest('[data-theme]')
    expect(scope).toBeTruthy()
    expect(scope.getAttribute('data-theme')).toBe('dark')
  })
})
