import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/theme.js'
import SectionEditor from '../../src/editor/SectionEditor.jsx'

// SectionEditor became a standalone component in the editor refactor. These
// tests exercise its immutable widget-list transforms and the "Add:" palette
// directly — the payload it hands back up through onUpdate/onAddWidget — without
// booting the whole Editor (session, autosave, tabs).

const section = {
  id: 's1',
  title: 'Links',
  widgets: [
    { id: 'w1', type: 'link', label: 'Site', url: 'https://a.example', icon: 'globe' },
    { id: 'w2', type: 'link', label: 'Shop', url: 'https://b.example', icon: 'globe' },
  ],
}

// No songs and no products: song/platforms/merch are gated, link/gigs/embed are not.
const content = {}
const canAdd = (needs) => !needs || (content[needs]?.length ?? 0) > 0

async function renderSection(props = {}) {
  const handlers = {
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onAddWidget: vi.fn(),
    onUnfurl: vi.fn(),
    setOpenWidget: vi.fn(),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <SectionEditor
        section={section}
        content={content}
        index={0}
        count={2}
        openWidget={null}
        canAdd={canAdd}
        {...handlers}
      />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('SectionEditor (extracted editor component)', () => {
  it('renders one row per widget with its summary label', async () => {
    const { screen } = await renderSection()
    await expect.element(screen.getByRole('button', { name: 'Link · Site' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Link · Shop' })).toBeInTheDocument()
  })

  it('reorders widgets immutably when moving one down', async () => {
    const { screen, handlers } = await renderSection()
    const downButtons = screen.getByRole('button', { name: 'Move widget down' })
    await downButtons.first().click()

    expect(handlers.onUpdate).toHaveBeenCalledWith({
      widgets: [section.widgets[1], section.widgets[0]],
    })
    // The original section array is untouched.
    expect(section.widgets[0].id).toBe('w1')
  })

  it('deletes a widget by filtering it out of the list', async () => {
    const { screen, handlers } = await renderSection()
    const deleteButtons = screen.getByRole('button', { name: 'Delete widget' })
    await deleteButtons.first().click()

    expect(handlers.onUpdate).toHaveBeenCalledWith({ widgets: [section.widgets[1]] })
  })

  it('reports a section title patch through onUpdate', async () => {
    const { screen, handlers } = await renderSection()
    const field = screen.getByPlaceholder('Section title (optional)')
    await field.fill('Merch')

    expect(handlers.onUpdate).toHaveBeenCalledWith({ title: 'Merch' })
  })

  it('adds a widget of the requested type via the palette', async () => {
    const { screen, handlers } = await renderSection()
    await screen.getByRole('button', { name: 'Link', exact: true }).click()
    expect(handlers.onAddWidget).toHaveBeenCalledWith('link')
  })

  it('disables add buttons whose required content is missing', async () => {
    const { screen } = await renderSection()
    // No products synced, so Merch is gated; Link is always available.
    await expect.element(screen.getByRole('button', { name: 'Merch', exact: true })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Link', exact: true })).toBeEnabled()
  })
})
