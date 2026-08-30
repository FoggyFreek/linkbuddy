import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import PagePreview from '../../editor/components/PagePreview.jsx'
import BandLogo from '../../../components/BandLogo.js'

// The band logo swap (BandTitle in features/public-links-card) picks `logoUrl` on a light
// page and `logoDarkUrl` on a dark one — where "the page" means the enclosing
// ColorSchemeScope, never the document. Both the public page and the editor
// preview render the same scope + stack, and both must survive a *disagreeing*
// document scheme: the editor's own scheme lives on <html data-theme>, and on a
// visitor's device the anti-flash script in index.html writes that attribute
// too (from a stored `mui-mode`). A light page inside a dark document must
// still show the light logo.
const LOGO = 'https://cdn.test/logo-light.png'
const LOGO_DARK = 'https://cdn.test/logo-dark.png'

const state = { page: null }
vi.mock('../../../lib/api.js', () => ({
  getPublicPage: () => Promise.resolve(state.page),
  sendView: () => {},
  sendClick: () => {},
}))

const { default: BandPage } = await import('../../../app/routes/BandPage.jsx')

function mockPage(overrides = {}) {
  return {
    sections: [],
    ...overrides,
    band: { name: 'The Testers', slug: 'testers', ...(overrides.band || {}) },
  }
}

// `docMode` is the *document's* scheme (the editor's own / the visitor's stored
// mode), deliberately independent of the page's.
function renderPublic(page, docMode) {
  state.page = page
  return render(
    <ThemeProvider theme={theme} defaultMode={docMode}>
      <CssBaseline enableColorScheme />
      <BandPage slug="testers" />
    </ThemeProvider>,
  )
}

function renderPreview(preview, docMode) {
  return render(
    <ThemeProvider theme={theme} defaultMode={docMode}>
      <CssBaseline enableColorScheme />
      <PagePreview preview={preview} />
    </ThemeProvider>,
  )
}

function logos() {
  return [...document.querySelectorAll('header img')].filter((el) => !el.closest('.MuiAvatar-root'))
}

// The visible logo, once the scheme's styles have settled.
function shownLogo() {
  return vi.waitFor(() => {
    const shown = logos().filter((el) => getComputedStyle(el).display !== 'none')
    expect(shown).toHaveLength(1)
    return shown[0].getAttribute('src')
  })
}

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.theme
})

describe('band logo follows the page scheme, not the document scheme', () => {
  const band = { name: 'The Testers', logoUrl: LOGO, logoDarkUrl: LOGO_DARK }

  for (const docMode of ['light', 'dark']) {
    describe(`document scheme: ${docMode}`, () => {
      it('published: light page shows the light logo', async () => {
        const screen = await renderPublic(mockPage({ theme: 'light', band }), docMode)
        await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(await shownLogo()).toBe(LOGO)
      })

      it('published: dark page shows the dark logo', async () => {
        const screen = await renderPublic(mockPage({ theme: 'dark', band }), docMode)
        await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(await shownLogo()).toBe(LOGO_DARK)
      })

      it('preview: light page shows the light logo', async () => {
        const screen = await renderPreview({ theme: 'light', sections: [], band }, docMode)
        await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(await shownLogo()).toBe(LOGO)
      })

      it('preview: dark page shows the dark logo', async () => {
        const screen = await renderPreview({ theme: 'dark', sections: [], band }, docMode)
        await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(await shownLogo()).toBe(LOGO_DARK)
      })
    })
  }

  it('falls back to the only logo a band uploaded, in either scheme', async () => {
    const screen = await renderPreview({ theme: 'light', sections: [], band: { name: 'The Testers', logoDarkUrl: LOGO_DARK } }, 'dark')
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(await shownLogo()).toBe(LOGO_DARK)
    cleanup()

    const screen2 = await renderPreview({ theme: 'dark', sections: [], band: { name: 'The Testers', logoUrl: LOGO } }, 'light')
    await expect.element(screen2.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(await shownLogo()).toBe(LOGO)
  })
})

// `width` scales the logo down while the browser keeps its aspect ratio: it
// drives the width and the height follows, so the default `maxHeight` cap —
// which would clamp height independently against a now definite width and
// squash the artwork — steps aside once a width is given. The fixture is
// 200x100, a 2:1 ratio, inside a 400px box.
describe('BandLogo width', () => {
  const FIXTURE = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'/>")}`
  const band = { name: 'The Testers', logoUrl: FIXTURE }

  it('defaults to auto and otherwise scales to the given width', async () => {
    await render(
      <ThemeProvider theme={theme}>
        {[undefined, 120, '25%'].map((width, i) => (
          <Box key={i} data-case={String(width)} sx={{ width: 400 }}>
            <BandLogo band={band} width={width} />
          </Box>
        ))}
      </ThemeProvider>,
    )

    const measure = (value) => vi.waitFor(() => {
      const img = document.querySelector(`[data-case="${value}"] img`)
      expect(img.naturalWidth).toBe(200)
      const { width, height } = img.getBoundingClientRect()
      return { width, height, maxHeight: getComputedStyle(img).maxHeight }
    })

    // Unset: natural size, capped by maxHeight — 83px tall, so 166px wide.
    const auto = await measure('undefined')
    expect(auto.maxHeight).toBe('83px')
    expect(auto.height).toBeCloseTo(83, 0)
    expect(auto.width).toBeCloseTo(166, 0)

    // A number is px, and the height follows the 2:1 ratio rather than the cap.
    const fixed = await measure('120')
    expect(fixed.maxHeight).toBe('none')
    expect(fixed.width).toBeCloseTo(120, 0)
    expect(fixed.height).toBeCloseTo(60, 0)

    // Any CSS width works, ratio still intact.
    const relative = await measure('25%')
    expect(relative.width).toBeCloseTo(100, 0)
    expect(relative.height).toBeCloseTo(50, 0)
  })
})
