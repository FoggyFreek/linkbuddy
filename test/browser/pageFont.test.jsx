import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Typography from '@mui/material/Typography'
import theme from '../../src/lib/theme.js'

// The public page's typeface: layout.font → resolved payload → PageScope sets the
// theme's font variable on the scope element. What these tests pin is that the
// variable actually reaches rendered text, and that it stops at the scope — the
// same containment guarantee colorSchemeScope.test.jsx asserts for colours.
const state = { page: null }
vi.mock('../../src/lib/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../../src/app/routes/BandPage.jsx')
const { default: ReleasePage } = await import('../../src/app/routes/ReleasePage.jsx')

function mockPage(overrides = {}) {
  return {
    sections: [
      {
        id: 's1',
        title: 'Latest release',
        widgets: [{ id: 'w1', type: 'link', label: 'Official shop', sublabel: 'Vinyl & merch', url: '#', icon: 'globe' }],
      },
    ],
    ...overrides,
    band: { name: 'The Testers', bio: 'Loud, clear, and cookie-free.', slug: 'testers', socials: {}, ...(overrides.band || {}) },
  }
}

function renderBand() {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Typography data-testid="outside">Editor chrome</Typography>
      <BandPage slug="testers" />
    </ThemeProvider>,
  )
}

function renderRelease() {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <ReleasePage slug="testers/hurricane" />
    </ThemeProvider>,
  )
}

const systemStack = /system-ui/

beforeEach(() => {
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  cleanup()
  state.page = null
})

describe('page font', () => {
  it('renders every text on the page in the chosen face', async () => {
    state.page = mockPage({ font: 'bebas' })
    const screen = await renderBand()
    await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()

    // Band name (h1), section title (h3) and a widget label (body1) are three
    // different typography variants — MUI stamps fontFamily onto each of them, so
    // all three have to resolve through the page's variable, not just the ones
    // that happen to inherit.
    for (const node of [
      screen.getByRole('heading', { name: 'The Testers' }),
      screen.getByText('Latest release'),
      screen.getByText('Official shop'),
    ]) {
      expect(getComputedStyle(node.element()).fontFamily).toContain('Bebas Neue')
    }
  })

  it('actually loads the face it names, from our own origin', async () => {
    state.page = mockPage({ font: 'bebas' })
    const screen = await renderBand()
    await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()

    // Naming a family in the theme is not enough — the @font-face rules have to
    // reach CssBaseline, or the page silently falls through to a fallback while
    // computed style still reads 'Bebas Neue'.
    await document.fonts.load('700 34px "Bebas Neue"')
    expect(document.fonts.check('700 34px "Bebas Neue"')).toBe(true)

    const face = [...document.fonts].find((f) => f.family.includes('Bebas Neue'))
    expect(face.status).toBe('loaded')
  })

  it('leaves the surrounding application on the theme font', async () => {
    state.page = mockPage({ font: 'bebas' })
    const screen = await renderBand()
    await expect.element(screen.getByRole('heading', { name: 'The Testers' })).toBeInTheDocument()

    // The page's font variable is scoped to the page, exactly like its colour
    // scheme: a sibling outside the scope keeps the system stack.
    const outside = screen.getByTestId('outside').element()
    expect(getComputedStyle(outside).fontFamily).toMatch(systemStack)
    expect(getComputedStyle(outside).fontFamily).not.toContain('Bebas Neue')
  })

  it('falls back to the theme stack for the system font', async () => {
    state.page = mockPage({ font: 'system' })
    const screen = await renderBand()
    const heading = screen.getByRole('heading', { name: 'The Testers' })
    await expect.element(heading).toBeInTheDocument()
    expect(getComputedStyle(heading.element()).fontFamily).toMatch(systemStack)
  })

  it('falls back to the theme stack for a key this build does not know', async () => {
    state.page = mockPage({ font: 'papyrus' })
    const screen = await renderBand()
    const heading = screen.getByRole('heading', { name: 'The Testers' })
    await expect.element(heading).toBeInTheDocument()
    expect(getComputedStyle(heading.element()).fontFamily).toMatch(systemStack)
  })

  it('applies to a release page too, independently of its dark scheme', async () => {
    state.page = mockPage({ font: 'oswald', theme: 'dark', release: { title: 'Hurricane EP', artist: 'The Testers', coverUrl: null } })
    const screen = await renderRelease()
    const title = screen.getByText('Hurricane EP')
    await expect.element(title).toBeInTheDocument()
    expect(getComputedStyle(title.element()).fontFamily).toContain('Oswald')
    expect(title.element().closest('[data-theme]').getAttribute('data-theme')).toBe('dark')
  })
})
