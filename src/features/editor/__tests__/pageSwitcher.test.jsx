import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { userEvent } from 'vitest/browser'
import theme from '../../../lib/theme.js'
import PageSwitcher from '../components/PageSwitcher.jsx'

// PageSwitcher is the tab bar for moving between a tenant's pages; the trailing
// "+" tab starts a new release page rather than selecting one.
const PAGES = [
  { id: 1, pageType: 'main', slug: 'band', publishedAt: '2026-01-01T00:00:00Z' },
  { id: 2, pageType: 'release', slug: 'band/single', publishedAt: null },
]

async function renderSwitcher(props = {}) {
  const handlers = {
    pages: PAGES,
    currentId: 1,
    hasSongs: true,
    labelFor: (p) => p.slug,
    onSelect: vi.fn(),
    onNewRelease: vi.fn(),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <PageSwitcher {...handlers} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('PageSwitcher', () => {
  it('renders one tab per page and marks the current one selected', async () => {
    const { screen } = await renderSwitcher()
    const current = screen.getByRole('tab', { name: /band$/ })
    await expect.element(current).toHaveAttribute('aria-selected', 'true')
    const other = screen.getByRole('tab', { name: /band\/single/ })
    await expect.element(other).toHaveAttribute('aria-selected', 'false')
  })

  it('marks an unpublished page that is not the current one as a draft', async () => {
    const { screen } = await renderSwitcher()
    await expect.element(screen.getByRole('tab', { name: /band\/single \(draft\)/ })).toBeInTheDocument()
  })

  it('selects a page when its tab is clicked', async () => {
    const { screen, handlers } = await renderSwitcher()
    await screen.getByRole('tab', { name: /band\/single/ }).click()
    expect(handlers.onSelect).toHaveBeenCalledWith(2)
    expect(handlers.onNewRelease).not.toHaveBeenCalled()
  })

  it('starts a new release page from the "+" tab without changing the selection', async () => {
    const { screen, handlers } = await renderSwitcher()
    await screen.getByRole('tab', { name: 'New release page' }).click()
    expect(handlers.onNewRelease).toHaveBeenCalledTimes(1)
    expect(handlers.onSelect).not.toHaveBeenCalled()
    await expect.element(screen.getByRole('tab', { name: /band$/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the "New release page" tooltip on hover', async () => {
    const { screen } = await renderSwitcher()
    await userEvent.hover(screen.getByRole('tab', { name: 'New release page' }))
    await expect.element(screen.getByRole('tooltip')).toHaveTextContent('New release page')
  })

  it('disables the "+" tab and explains why when the tenant has no songs', async () => {
    const { screen, handlers } = await renderSwitcher({ hasSongs: false })
    const add = screen.getByRole('tab', { name: 'New release page' })
    await expect.element(add).toBeDisabled()
    await userEvent.hover(add)
    await expect.element(screen.getByRole('tooltip')).toHaveTextContent('Add streaming links to a song in GigBuddy first')
    expect(handlers.onNewRelease).not.toHaveBeenCalled()
  })
})
