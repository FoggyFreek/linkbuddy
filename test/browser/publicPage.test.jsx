import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
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

// `band` is merged (so a test can set just `theme` without losing the name);
// every other key is a plain override.
function mockPage(overrides = {}) {
  return {
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
    band: {
      name: 'The Testers',
      bio: 'Loud, clear, and cookie-free.',
      slug: 'testers',
      socials: { instagram: 'testers' },
      theme: 'light',
      ...(overrides.band || {}),
    },
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
  // Unmount between tests — otherwise a previous render's DOM stays in the body
  // and can satisfy a `document.querySelector` meant for the current one.
  cleanup()
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
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    // The page renders inside a ColorSchemeScope that carries the scheme — the
    // document itself is left untouched. The scope paints the light page canvas
    // (#dcdee2) and the song card resolves to the light paper (#ffffff). Query
    // inside the section — the page's content shell is itself a Card.
    const card = document.querySelector('section .MuiCard-root')
    expect(card).toBeTruthy()
    const scope = card.closest('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('light')
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(220, 222, 226)')
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('switches every surface to the dark scheme for a dark-theme band', async () => {
    state.page = mockPage({ band: { theme: 'dark' } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    // The band's scheme lives on the scope wrapper, NOT on <html> — the editor's
    // own scheme owns the document, so the two never collide.
    const card = document.querySelector('section .MuiCard-root')
    const scope = card.closest('[data-theme]')
    expect(scope.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).not.toBe('dark')

    // The CSS-variable bridge yields the dark paper colour (#2f4257) for the
    // card and the dark page canvas (#16273d) for the scope's own background.
    await vi.waitFor(() => {
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 66, 87)')
    })
    expect(getComputedStyle(scope).backgroundColor).toBe('rgb(22, 39, 61)')
  })
})

describe('page content card', () => {
  it('wraps the whole band page in one centered card', async () => {
    state.page = mockPage()
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    // The outermost card inside the scope holds header, sections and footer.
    const scope = document.querySelector('[data-theme]')
    const card = scope.querySelector('.MuiCard-root')
    expect(card.contains(document.querySelector('header'))).toBe(true)
    expect(card.contains(document.querySelector('section'))).toBe(true)
    expect(card.contains(document.querySelector('footer'))).toBe(true)

    // Centered on the canvas: equal gutters left and right.
    const cardBox = card.getBoundingClientRect()
    const scopeBox = scope.getBoundingClientRect()
    expect(Math.abs((cardBox.left - scopeBox.left) - (scopeBox.right - cardBox.right))).toBeLessThan(2)
  })

  it('lands the share button in the top-right corner of that card', async () => {
    state.page = mockPage()
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    const card = document.querySelector('[data-theme] .MuiCard-root')
    const share = document.querySelector('[aria-label="Share this page"]')
    expect(card.contains(share)).toBe(true)
    // Pinned to the card, not the viewport — so it scrolls with the card.
    expect(getComputedStyle(share).position).toBe('absolute')
    expect(getComputedStyle(card).position).toBe('relative')

    const cardBox = card.getBoundingClientRect()
    const shareBox = share.getBoundingClientRect()
    expect(cardBox.right - shareBox.right).toBeLessThan(24)
    expect(shareBox.top - cardBox.top).toBeLessThan(24)
  })

  it('keeps the release layout full-bleed with a viewport-pinned share button', async () => {
    state.page = mockPage({ release: { title: 'Hurricane EP', artist: 'The Testers' } })
    const screen = await renderPage()
    await expect.element(screen.getByText('Hurricane EP')).toBeInTheDocument()

    const share = document.querySelector('[aria-label="Share this page"]')
    expect(getComputedStyle(share).position).toBe('fixed')
  })
})

describe('BandHeader logo / avatar', () => {
  const LOGO = 'https://cdn.test/logo-light.png'
  const LOGO_DARK = 'https://cdn.test/logo-dark.png'
  const AVATAR = 'https://cdn.test/avatar.png'

  function logos() {
    return [...document.querySelectorAll('header img')].filter((el) => !el.closest('.MuiAvatar-root'))
  }
  function visible(els) {
    return els.filter((el) => getComputedStyle(el).display !== 'none')
  }

  it('uses avatarUrl for the profile picture, not the logo', async () => {
    state.page = mockPage({ band: { avatarUrl: AVATAR, logoUrl: LOGO } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    const avatar = document.querySelector('.MuiAvatar-root img')
    expect(avatar.getAttribute('src')).toBe(AVATAR)
  })

  it('renders no avatar when the band has no avatarUrl', async () => {
    state.page = mockPage({ band: { logoUrl: LOGO } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    expect(document.querySelector('.MuiAvatar-root')).toBeNull()
  })

  it('types out the band name when no logo is set', async () => {
    state.page = mockPage({ band: { avatarUrl: AVATAR } })
    const screen = await renderPage()

    const heading = screen.getByRole('heading', { level: 1, name: 'The Testers' })
    await expect.element(heading).toBeInTheDocument()
    expect(heading.element().className).toContain('MuiTypography-h1')
    expect(logos()).toHaveLength(0)
  })

  it('shows the dark-ink logo instead of the name for a light-theme band', async () => {
    state.page = mockPage({ band: { theme: 'light', logoUrl: LOGO, logoDarkUrl: LOGO_DARK } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // The name is no longer typed out — the logo carries it, via its alt text.
    expect(document.querySelector('header').textContent).not.toContain('The Testers')
    const shown = visible(logos())
    expect(shown).toHaveLength(1)
    expect(shown[0].getAttribute('src')).toBe(LOGO_DARK)
    expect(shown[0].getAttribute('alt')).toBe('The Testers')
  })

  it('swaps to the light-ink logo for a dark-theme band', async () => {
    state.page = mockPage({ band: { theme: 'dark', logoUrl: LOGO, logoDarkUrl: LOGO_DARK } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    await vi.waitFor(() => {
      const shown = visible(logos())
      expect(shown).toHaveLength(1)
      expect(shown[0].getAttribute('src')).toBe(LOGO)
    })
    // The page scheme drives it — the document is untouched.
    expect(document.documentElement.dataset.theme).not.toBe('dark')
  })

  it('uses the only light logo on a dark page when no dark logo exists', async () => {
    state.page = mockPage({ band: { theme: 'dark', logoUrl: LOGO } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    const shown = visible(logos())
    expect(shown).toHaveLength(1)
    expect(shown[0].getAttribute('src')).toBe(LOGO)
  })

  it('uses the only dark logo on a light page when no light logo exists', async () => {
    state.page = mockPage({ band: { theme: 'light', logoDarkUrl: LOGO_DARK } })
    const screen = await renderPage()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    const shown = visible(logos())
    expect(shown).toHaveLength(1)
    expect(shown[0].getAttribute('src')).toBe(LOGO_DARK)
  })
})
