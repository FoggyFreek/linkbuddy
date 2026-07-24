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

    // The song card's background resolves --card -> --mui-palette-background-paper.
    const card = document.querySelector('.MuiCard-root')
    expect(card).toBeTruthy()
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('switches every surface to the dark scheme for a dark-theme band', async () => {
    state.page = mockPage({ band: { theme: 'dark' } })
    const screen = await renderPage()
    await expect.element(screen.getByText('The Testers')).toBeInTheDocument()

    // PublicPage forces the band's chosen scheme onto <html>.
    await vi.waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })

    // The same CSS-variable bridge now yields the dark paper colour (#2f4257),
    // confirming the MUI colour scheme drives the plain-CSS cards.
    const card = document.querySelector('.MuiCard-root')
    await vi.waitFor(() => {
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)')
    })
    // And the page background is the dark canvas (#26374d), set by CssBaseline.
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(38, 55, 77)')
  })
})
