import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'

// The router reads window.location at render, so each case pushes a path first.
// PublicPage's network layer is stubbed — this asserts which root App picks,
// not what that root then renders.
vi.mock('../../src/lib/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicPage: () => new Promise(() => {}),
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

beforeEach(() => cleanup())
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
})
