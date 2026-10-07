import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import DeleteReleaseDialog from '../components/DeleteReleaseDialog.jsx'

afterEach(cleanup)

async function renderDialog(props = {}) {
  const handlers = {
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <DeleteReleaseDialog title="First Single" slug="the-testers/first-single" {...handlers} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('DeleteReleaseDialog', () => {
  it('names the page and its address and warns that statistics go too', async () => {
    const { screen } = await renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Delete “First Single”?' })
    await expect.element(dialog).toBeInTheDocument()
    await expect.element(dialog.getByText('/the-testers/first-single')).toBeInTheDocument()
    await expect.element(dialog.getByText(/statistics are deleted too/)).toBeInTheDocument()
  })

  it('confirms the deletion', async () => {
    const { screen, handlers } = await renderDialog()
    await screen.getByRole('button', { name: 'Delete' }).click()
    await expect.poll(() => handlers.onConfirm.mock.calls.length).toBe(1)
    expect(handlers.onCancel).not.toHaveBeenCalled()
  })

  it('cancels from the button and from Escape without deleting', async () => {
    const { screen, handlers } = await renderDialog()
    await screen.getByRole('button', { name: 'Cancel' }).click()
    await userEvent.keyboard('{Escape}')
    expect(handlers.onCancel).toHaveBeenCalledTimes(2)
    expect(handlers.onConfirm).not.toHaveBeenCalled()
  })

  it('locks the dialog while the deletion is in flight', async () => {
    const onConfirm = vi.fn(() => new Promise(() => {}))
    const { screen, handlers } = await renderDialog({ onConfirm })
    await screen.getByRole('button', { name: 'Delete' }).click()

    await expect.element(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(handlers.onCancel).not.toHaveBeenCalled()
  })

  it('shows a failed deletion and allows a retry', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('Page not found')).mockResolvedValue(undefined)
    const { screen } = await renderDialog({ onConfirm })

    await screen.getByRole('button', { name: 'Delete' }).click()
    await expect.element(screen.getByText('Page not found')).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Delete' }).click()
    await expect.poll(() => onConfirm.mock.calls.length).toBe(2)
  })
})
