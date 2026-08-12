import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'

// Same mocked network layer as the other public-page tests: the real routes run,
// only the API is fixed.
const state = { page: null }
vi.mock('../../src/lib/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../../src/app/routes/BandPage.jsx')
const { default: ReleasePage } = await import('../../src/app/routes/ReleasePage.jsx')

const AVATAR = 'https://cdn.example.com/avatar.png'
const COVER = 'https://cdn.example.com/hurricane.jpg'

function mockPage(band = {}, overrides = {}) {
  return { sections: [], ...overrides, band: { name: 'The Testers', slug: 'testers', ...band } }
}

function renderRoute(node) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

function iconHref() {
  return document.querySelector('link[rel="icon"]')?.getAttribute('href') || null
}

// The tab icon is a document-level side effect, so it survives unmounting.
// Clearing it between tests keeps one test's icon from satisfying the next.
beforeEach(() => {
  document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove())
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove())
})

describe('tab icon', () => {
  it("uses the band's avatar on a band page", async () => {
    state.page = mockPage({ avatarUrl: AVATAR })
    const screen = await renderRoute(<BandPage slug="testers" />)
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    expect(iconHref()).toBe(AVATAR)
  })

  it('falls back to the GigBuddy logo when the band has no avatar', async () => {
    state.page = mockPage()
    const screen = await renderRoute(<BandPage slug="testers" />)
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    expect(iconHref()).toMatch(/gb_whiteback_128/)
  })

  it("uses the release's cover art on a release page", async () => {
    state.page = mockPage({ avatarUrl: AVATAR }, { release: { title: 'Hurricane EP', artist: 'The Testers', coverUrl: COVER } })
    const screen = await renderRoute(<ReleasePage slug="testers/hurricane" />)
    await expect.element(screen.getByText('Hurricane EP')).toBeInTheDocument()

    expect(iconHref()).toBe(COVER)
  })

  // A release page is about the release, so a coverless one falls back to the
  // logo rather than borrowing the band's avatar.
  it('falls back to the GigBuddy logo when the release has no cover art', async () => {
    state.page = mockPage({ avatarUrl: AVATAR }, { release: { title: 'Hurricane EP', artist: 'The Testers' } })
    const screen = await renderRoute(<ReleasePage slug="testers/hurricane" />)
    await expect.element(screen.getByText('Hurricane EP')).toBeInTheDocument()

    expect(iconHref()).toMatch(/gb_whiteback_128/)
  })

  it('reuses the existing icon link rather than stacking a second one', async () => {
    const existing = document.createElement('link')
    existing.rel = 'icon'
    existing.href = '/placeholder.png'
    document.head.appendChild(existing)

    state.page = mockPage({ avatarUrl: AVATAR })
    const screen = await renderRoute(<BandPage slug="testers" />)
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1)
    expect(iconHref()).toBe(AVATAR)
  })
})
