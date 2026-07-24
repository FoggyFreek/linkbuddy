import { page } from 'vitest/browser'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'
import { bandPage, releasePage, editorPage, editorPages, stats } from './fixtures.js'

// Renders every screen the app has against mock data, asserts the key layout /
// output is present, and captures a screenshot of each into __screens__/ for a
// visual sweep. One file mocks the whole api.js so both the public routes and
// the editor (session + pages + preview + stats) render without a live backend.

const state = { publicPage: null, preview: null }

vi.mock('../../src/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.publicPage),
  sendView: () => {},
  sendClick: () => {},
  getStoredSession: () => 'mock-session',
  storeSession: () => {},
  exchangeHandoff: () => Promise.resolve({}),
  listEditorPages: () => Promise.resolve({ pages: editorPages }),
  getEditorPage: () => Promise.resolve(editorPage()),
  createReleasePage: () => Promise.resolve({ page: editorPage() }),
  deleteEditorPage: () => Promise.resolve({}),
  saveDraft: () => Promise.resolve({}),
  getPreview: () => Promise.resolve(state.preview),
  publishPage: () => Promise.resolve({ publishedAt: new Date().toISOString() }),
  refreshContent: () => Promise.resolve(editorPage()),
  unfurlUrl: () => Promise.resolve({}),
  getStats: () => Promise.resolve(stats()),
}))

const { default: PublicPage } = await import('../../src/PublicPage.jsx')
const { default: Editor } = await import('../../src/Editor.jsx')
const { default: Privacy } = await import('../../src/Privacy.jsx')
const { default: CenteredStatus } = await import('../../src/CenteredStatus.jsx')

async function mount(node) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

// Capture the whole rendered body so long pages are captured in full (element
// screenshots span the element's box, not just the viewport).
const shoot = (name) => page.screenshot({ element: document.body, path: `__screens__/${name}.png` })

describe('Screen renders (mock data → layout validation + screenshots)', () => {
  it('public band page — light', async () => {
    await page.viewport(480, 900)
    state.publicPage = bandPage('light')
    const screen = await mount(<PublicPage slug="neon-harbour" />)

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()
    await expect.element(screen.getByText('Midnight Signal')).toBeInTheDocument()
    await expect.element(screen.getByText('Official shop')).toBeInTheDocument()
    await expect.element(screen.getByText('Upcoming Gigs')).toBeInTheDocument()
    await expect.element(screen.getByText('Tour T-shirt')).toBeInTheDocument()
    // The band page scopes itself to light: canvas #eceef2, no <html> override.
    const scope = document.querySelector('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('light')
    await shoot('public-band-light')
  })

  it('public band page — dark', async () => {
    await page.viewport(480, 900)
    state.publicPage = bandPage('dark')
    const screen = await mount(<PublicPage slug="neon-harbour" />)

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Neon Harbour' })).toBeInTheDocument()
    const scope = document.querySelector('.MuiCard-root').closest('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('dark')
    await vi.waitFor(() => {
      expect(getComputedStyle(scope).backgroundColor).toBe('rgb(38, 55, 77)')
    })
    await shoot('public-band-dark')
  })

  it('public release page — light (two-pane)', async () => {
    await page.viewport(1100, 820)
    state.publicPage = releasePage('light')
    const screen = await mount(<PublicPage slug="neon-harbour/midnight-signal" />)

    // On a release page the band <h1> is replaced by the release header (<h2>).
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Midnight Signal' })).toBeInTheDocument()
    await expect.element(screen.getByText('Stream now')).toBeInTheDocument()
    await expect.element(screen.getByText('Spotify')).toBeInTheDocument()
    await shoot('public-release-light')
  })

  it('public release page — dark (two-pane)', async () => {
    await page.viewport(1100, 820)
    state.publicPage = releasePage('dark')
    const screen = await mount(<PublicPage slug="neon-harbour/midnight-signal" />)

    await expect.element(screen.getByRole('heading', { level: 2, name: 'Midnight Signal' })).toBeInTheDocument()
    await shoot('public-release-dark')
  })

  it('privacy notice', async () => {
    await page.viewport(820, 900)
    const screen = await mount(<Privacy />)
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument()
    await shoot('privacy')
  })

  it('not-found / status page', async () => {
    await page.viewport(820, 500)
    const screen = await mount(<CenteredStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</CenteredStatus>)
    await expect.element(screen.getByText(/doesn.t exist/)).toBeInTheDocument()
    await shoot('status-notfound')
  })

  it('editor — Build tab', async () => {
    await page.viewport(980, 1000)
    const screen = await mount(<Editor />)

    // Waits out the session/page boot in useEditorSession. (Section titles are
    // TextField values, so assert on widget-summary buttons and controls.)
    await expect.element(screen.getByRole('heading', { level: 1, name: /Neon Harbour — link page/ })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Song · Midnight Signal' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Gigs · Upcoming Gigs' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Add section' })).toBeInTheDocument()
    // The page switcher lists the pages (main is starred).
    await expect.element(screen.getByText(/★ Neon Harbour/)).toBeInTheDocument()
    await shoot('editor-build')
  })

  it('editor — Preview tab', async () => {
    await page.viewport(980, 1000)
    state.preview = bandPage('dark')
    const screen = await mount(<Editor />)
    await expect.element(screen.getByRole('heading', { level: 1, name: /Neon Harbour — link page/ })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Preview' }).click()
    await expect.element(screen.getByText('This is exactly what visitors see.')).toBeInTheDocument()
    // A dark-theme preview inside a (light) editor: independent scopes.
    await vi.waitFor(() => {
      const previewScope = document.querySelector('.MuiCard-root').closest('[data-theme]')
      expect(previewScope.getAttribute('data-theme')).toBe('dark')
    })
    await shoot('editor-preview')
  })

  it('editor — Statistics tab', async () => {
    await page.viewport(980, 1100)
    const screen = await mount(<Editor />)
    await expect.element(screen.getByRole('heading', { level: 1, name: /Neon Harbour — link page/ })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Statistics' }).click()
    await expect.element(screen.getByText('Est. unique visits')).toBeInTheDocument()
    await expect.element(screen.getByText('Views per day')).toBeInTheDocument()
    await expect.element(screen.getByText('Conversion by source')).toBeInTheDocument()
    await shoot('editor-stats')
  })
})
