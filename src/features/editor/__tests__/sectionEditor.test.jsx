import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import SectionEditor from '../components/SectionEditor.jsx'

// SectionEditor became a standalone component in the editor refactor. These
// tests exercise its immutable widget-list transforms and the add menu
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

// Widget reordering is owned by LayoutBuilder (a widget can be dragged into
// another section), so here it's a stub; widgetReorder.test.jsx covers the real
// thing through LayoutBuilder.
const idle = { active: false, dragging: false, swap: false, before: false, after: false }
const widgetDrag = {
  active: false,
  itemState: () => idle,
  insertAt: () => false,
  handleProps: () => ({}),
  listProps: () => ({}),
  itemProps: {},
}

async function renderSection(props = {}) {
  const handlers = {
    onUpdate: vi.fn(),
    onMoveWidgetByKey: vi.fn(),
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
        openWidget={null}
        canAdd={canAdd}
        drop={idle}
        handleProps={{}}
        itemProps={{}}
        widgetDrag={widgetDrag}
        {...handlers}
      />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('SectionEditor (extracted editor component)', () => {
  it('renders one row per widget with its summary label', async () => {
    const { screen } = await renderSection()
    await expect.element(screen.getByRole('button', { name: 'Custom link · Site' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Custom link · Shop' })).toBeInTheDocument()
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

  it('adds a widget of the requested type from the add menu', async () => {
    const { screen, handlers } = await renderSection()
    await screen.getByRole('button', { name: 'Add' }).click()
    await screen.getByRole('menuitem', { name: 'Custom link' }).click()
    expect(handlers.onAddWidget).toHaveBeenCalledWith('link')
  })

  it('offers every widget type in the add menu', async () => {
    const { screen } = await renderSection()
    await screen.getByRole('button', { name: 'Add' }).click()
    for (const label of ['Song', 'Platform buttons', 'Gigs', 'Accolades', 'Merch', 'Custom link', 'Embed']) {
      await expect.element(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }
  })

  it('hides release-only widget types on the main page', async () => {
    const { screen } = await renderSection({ pageType: 'main' })
    await screen.getByRole('button', { name: 'Add' }).click()
    await expect.element(screen.getByRole('menuitem', { name: 'Custom link' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Platform buttons' }).elements()).toHaveLength(0)
  })

  it('disables menu items whose required content is missing', async () => {
    const { screen } = await renderSection()
    await screen.getByRole('button', { name: 'Add' }).click()
    // No products synced, so Merch is gated; Custom link is always available.
    await expect.element(screen.getByRole('menuitem', { name: 'Merch' })).toHaveAttribute('aria-disabled', 'true')
    await expect.element(screen.getByRole('menuitem', { name: 'Custom link' })).not.toHaveAttribute('aria-disabled')
  })

  it('shows the "Add" tooltip on the add button', async () => {
    const { screen } = await renderSection()
    await userEvent.hover(screen.getByRole('button', { name: 'Add' }))
    await expect.element(screen.getByRole('tooltip')).toHaveTextContent('Add')
  })
})

it('adds an accolades carousel from the section menu', async () => {
  const { screen, handlers } = await renderSection()
  await screen.getByRole('button', { name: 'Add' }).click()
  await screen.getByRole('menuitem', { name: 'Accolades', exact: true }).click()
  expect(handlers.onAddWidget).toHaveBeenCalledWith('accolades')
})

it('adds a discography carousel from the section menu', async () => {
  const { screen, handlers } = await renderSection()
  await screen.getByRole('button', { name: 'Add' }).click()
  await screen.getByRole('menuitem', { name: 'Discography' }).click()
  expect(handlers.onAddWidget).toHaveBeenCalledWith('discography')
})
