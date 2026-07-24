import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'

// Mock the network layer so the real PublicPage data-loading path runs against
// fixed mock data instead of a live API. Each test sets the resolved page.
const state = { page: null }
vi.mock('../../src/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

// Imported after the mock is registered.
const { default: PublicPage } = await import('../../src/PublicPage.jsx')

function mockPage(overrides = {}) {
  return {
    band: {
      name: 'The Testers',
      bio: 'Loud, clear, and cookie-free.',
      slug: 'testers',
      socials: { instagram: 'testers' },
      theme: 'light',
      ...(overrides.band || {}),
    },
    sections: [
      {
        id: 's1',
        title: 'Latest release',
        widgets: [
          { id: 'w1', type: 'song', title: 'Midnight Signal', artist: 'The Testers', coverUrl: null, links: [{ url: '#', label: 'Listen' }] },
          { id: 'w2', type: 'link', label: 'Official shop', sublabel: 'Vinyl & merch', url: '#', icon: 'globe' },
        ],
      },
    ],
    ...overrides,
  }
}

function renderPage() {
  // vitest-browser-react's render resolves asynchronously (act flush).
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <PublicPage slug="testers" />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('PublicPage rendering (real component, mocked API)', () => {
  it('renders the band name as an MUI Typography h1', async () => {
    state.page = mockPage()
    const screen = await renderPage()

    const heading = screen.getByRole('heading', { level: 1, name: 'The Testers' })
    await expect.element(heading).toBeInTheDocument()

    const el = heading.element()
    expect(el.className).toContain('MuiTypography-h1')
    // The h1 variant is larger than default body text and driven by the theme.
    const fontSize = parseFloat(getComputedStyle(el).fontSize)
    expect(fontSize).toBeGreaterThan(20)
  })

  it('renders card labels through the MUI body1 type scale', async () => {
    state.page = mockPage()
    const screen = await renderPage()

    const label = screen.getByText('Official shop')
    await expect.element(label).toBeInTheDocument()
    expect(label.element().className).toContain('MuiTypography-body1')

    const sublabel = screen.getByText('Vinyl & merch')
    expect(sublabel.element().className).toContain('MuiTypography-caption')
  })

  it('paints a light surface for a light-theme band', async () => {
    state.page = mockPage({ band: { theme: 'light' } })
    const screen = await renderPage()
    await expect.element(screen.getByText('The Testers')).toBeInTheDocument()

    // The page renders inside a ColorSchemeScope that carries the scheme — the
    // document itself is left untouched. The scope paints the light canvas
    // (#eceef2) and the song card resolves to the light paper (#ffffff).
    const card = document.querySelector('.MuiCard-root')
    expect(card).toBeTruthy()
    const scope = card.closest('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('light')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(236, 238, 242)')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('switches every surface to the dark scheme for a dark-theme band', async () => {
    state.page = mockPage({ band: { theme: 'dark' } })
    const screen = await renderPage()
    await expect.element(screen.getByText('The Testers')).toBeInTheDocument()

    // The band's scheme lives on the scope wrapper, NOT on <html> — the editor's
    // own scheme owns the document, so the two never collide.
    const card = document.querySelector('.MuiCard-root')
    const scope = card.closest('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).not.toBe('dark')

    // The CSS-variable bridge yields the dark paper colour (#2f4257) for the
    // card and the dark canvas (#26374d) for the scope's own background.
    await vi.waitFor(() => {
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)')
    })
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(38, 55, 77)')
  })
})
