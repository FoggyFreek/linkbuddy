import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'

// The router reads window.location at render, so each case pushes a path first.
// The page routes' network layer is stubbed — this asserts which root App picks,
// not what that root then renders. `state.page` is null for the cases that only
// care about the choice of root (the fetch never settles); the two page-kind
// cases set it so the mounted route renders something identifiable.
const state = { page: null }
vi.mock('../../src/lib/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicPage: () => (state.page ? Promise.resolve(state.page) : new Promise(() => {})),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: App } = await import('../../src/app/App.jsx')

const original = window.location.pathname

function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  cleanup()
  state.page = null
})
afterEach(() => window.history.pushState({}, '', original))

describe('App routing', () => {
  it('shows the server placeholder at the root', async () => {
    const screen = await renderAt('/')
    await expect.element(screen.getByText(/GigBuddy band link page server/)).toBeInTheDocument()
  })

  it('renders the privacy notice at /privacy', async () => {
    const screen = await renderAt('/privacy')
    await expect.element(screen.getByText('Privacy notice')).toBeInTheDocument()
  })

  it('treats a trailing slash as the same route', async () => {
    const screen = await renderAt('/privacy/')
    await expect.element(screen.getByText('Privacy notice')).toBeInTheDocument()
  })

  it('rejects a malformed percent-encoded slug as not-found instead of throwing', async () => {
    const screen = await renderAt('/%E0%A4%A')
    await expect.element(screen.getByText(/doesn.t exist/)).toBeInTheDocument()
  })

  it('rejects an over-deep path as not-found', async () => {
    const screen = await renderAt('/a/b/c')
    await expect.element(screen.getByText(/doesn.t exist/)).toBeInTheDocument()
  })

  // The segment count picks the page kind, and the two kinds are separate
  // components: one segment is a band's link page, two are a release smart link.
  it('mounts the band page for a one-segment path', async () => {
    state.page = { band: { name: 'The Testers', slug: 'testers', socials: {} }, release: null, sections: [] }
    const screen = await renderAt('/testers')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()
    // The band page's card carries the share button; the release page pins it
    // to the viewport instead.
    expect(getComputedStyle(document.querySelector('[aria-label="Share this page"]')).position).toBe('absolute')
  })

  it('mounts the release page for a two-segment path', async () => {
    state.page = {
      band: { name: 'The Testers', slug: 'testers', socials: {} },
      release: { title: 'Hurricane EP', artist: 'The Testers', coverUrl: null },
      sections: [],
    }
    const screen = await renderAt('/testers/hurricane')
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Hurricane EP' })).toBeInTheDocument()
    expect(getComputedStyle(document.querySelector('[aria-label="Share this page"]')).position).toBe('fixed')
  })
})
