import { afterEach, describe, expect, it } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'
import EditorHeader from '../../src/features/editor/components/EditorHeader.js'

const page = { pageType: 'main', publicUrl: 'https://example.com/testers' }

const band = { name: 'The Testers', logoUrl: 'https://cdn.test/logo-light.png' }

function renderHeader(overrides = {}, mode = 'light') {
  return render(
    <ThemeProvider theme={theme} defaultMode={mode} modeStorageKey={`mode-${Math.random()}`}>
      <CssBaseline enableColorScheme />
      <EditorHeader
        page={{ ...page, ...overrides }}
        title={overrides.pageType === 'release' ? 'Test Release' : 'The Testers'}
        saveLabel="All changes saved"
        publishedAt={null}
        onRefresh={() => {}}
        onDelete={() => {}}
        onPublish={() => {}}
      />
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.theme
})

describe('EditorHeader', () => {
  it('shows the centered linkBuddy brand at the very top', async () => {
    const screen = await renderHeader()
    const brand = screen.getByRole('heading', { name: 'linkBuddy' })
    await expect.element(brand).toBeInTheDocument()
    expect(getComputedStyle(brand.element()).textAlign).toBe('center')
  })
})

// The header's title is always the page's title in type — never artwork, even
// when the band has a logo uploaded.
describe('EditorHeader title', () => {
  it('keeps the band name in type when the band has a logo', async () => {
    const screen = await renderHeader({ content: { band } })
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()
    expect(document.querySelectorAll('header img')).toHaveLength(0)
  })

  it('survives a page whose content has not loaded yet', async () => {
    const screen = await renderHeader({ content: undefined })
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()
  })

  it('shows the release title on a release page', async () => {
    const screen = await renderHeader({ pageType: 'release', content: { band } })
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Test Release' })).toBeInTheDocument()
    expect(document.querySelectorAll('header img')).toHaveLength(0)
  })
})
