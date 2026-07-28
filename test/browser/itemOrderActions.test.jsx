import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'
import ItemOrderActions from '../../src/features/editor/components/ItemOrderActions.jsx'

// The move-up / move-down / delete trio shared by section and widget rows. It
// generates its own aria-labels and derives boundary-disabling from index/count,
// with explicit overrides for widgets that continue into adjacent sections.

async function renderActions(props = {}) {
  const handlers = { onMove: vi.fn(), onDelete: vi.fn() }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <ItemOrderActions index={1} count={3} itemLabel="widget" {...handlers} {...props} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('ItemOrderActions (shared row controls)', () => {
  it('generates aria-labels from itemLabel', async () => {
    const { screen } = await renderActions({ itemLabel: 'section' })
    await expect.element(screen.getByRole('button', { name: 'Move section up' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Move section down' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Delete section' })).toBeInTheDocument()
  })

  it('disables move-up at the first position, leaving the others enabled', async () => {
    const { screen } = await renderActions({ index: 0, count: 3 })
    await expect.element(screen.getByRole('button', { name: 'Move widget up' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Move widget down' })).toBeEnabled()
    await expect.element(screen.getByRole('button', { name: 'Delete widget' })).toBeEnabled()
  })

  it('disables move-down at the last position', async () => {
    const { screen } = await renderActions({ index: 2, count: 3 })
    await expect.element(screen.getByRole('button', { name: 'Move widget up' })).toBeEnabled()
    await expect.element(screen.getByRole('button', { name: 'Move widget down' })).toBeDisabled()
  })

  it('disables both move controls when the list holds a single item', async () => {
    const { screen } = await renderActions({ index: 0, count: 1 })
    await expect.element(screen.getByRole('button', { name: 'Move widget up' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Move widget down' })).toBeDisabled()
  })

  it('reports the direction through onMove and fires onDelete', async () => {
    const { screen, handlers } = await renderActions({ index: 1, count: 3 })
    await screen.getByRole('button', { name: 'Move widget up' }).click()
    expect(handlers.onMove).toHaveBeenCalledWith(-1)
    await screen.getByRole('button', { name: 'Move widget down' }).click()
    expect(handlers.onMove).toHaveBeenCalledWith(1)
    await screen.getByRole('button', { name: 'Delete widget' }).click()
    expect(handlers.onDelete).toHaveBeenCalled()
  })

  it('allows callers to override local list boundaries', async () => {
    const { screen, handlers } = await renderActions({
      index: 0,
      count: 1,
      canMoveUp: true,
      canMoveDown: true,
    })
    await screen.getByRole('button', { name: 'Move widget up' }).click()
    await screen.getByRole('button', { name: 'Move widget down' }).click()
    expect(handlers.onMove.mock.calls).toEqual([[-1], [1]])
  })
})
