import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import NewReleaseForm from '../components/NewReleaseForm.jsx'

const songs = [
  { id: 11, title: 'First Single', artist: 'The Testers' },
  { id: 22, title: 'Second & Loud', artist: 'The Testers' },
]
const albums = [{ id: 5, title: 'Debut LP', artist: 'The Testers' }]

afterEach(cleanup)

async function renderForm(props = {}) {
  const handlers = {
    onCreate: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <NewReleaseForm songs={songs} albums={albums} mainSlug="the-testers" {...handlers} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('NewReleaseForm', () => {
  it('seeds the first song and creates the full release path', async () => {
    const { screen, handlers } = await renderForm()
    await expect.element(screen.getByLabelText('Page address')).toHaveValue('first-single')

    await screen.getByRole('button', { name: 'Create' }).click()

    await expect.poll(() => handlers.onCreate.mock.calls.length).toBe(1)
    expect(handlers.onCreate).toHaveBeenCalledWith({ songId: 11 }, 'the-testers/first-single')
  })

  it('creates a smart link for an album', async () => {
    const { screen, handlers } = await renderForm()
    await screen.getByLabelText('Song or album').click()
    await screen.getByRole('option', { name: /Debut LP/ }).click()
    await expect.element(screen.getByLabelText('Page address')).toHaveValue('debut-lp')

    await screen.getByRole('button', { name: 'Create' }).click()

    await expect.poll(() => handlers.onCreate.mock.calls.length).toBe(1)
    expect(handlers.onCreate).toHaveBeenCalledWith({ albumId: 5 }, 'the-testers/debut-lp')
  })

  it('updates and slugifies the address when the song or text changes', async () => {
    const { screen } = await renderForm()
    await screen.getByLabelText('Song or album').click()
    await screen.getByRole('option', { name: /Second & Loud/ }).click()
    await expect.element(screen.getByLabelText('Page address')).toHaveValue('second-loud')

    await screen.getByLabelText('Page address').fill('  Summer / Anthem!  ')
    await expect.element(screen.getByLabelText('Page address')).toHaveValue('summer-anthem')
  })

  it('shows creation failures and allows a retry or cancellation', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Slug already exists'))
    const { screen, handlers } = await renderForm({ onCreate })

    await screen.getByRole('button', { name: 'Create' }).click()
    await expect.element(screen.getByText('Slug already exists')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled()

    await screen.getByRole('button', { name: 'Cancel' }).click()
    expect(handlers.onCancel).toHaveBeenCalledOnce()
  })

  it('disables creation when no songs or albums are available', async () => {
    const { screen } = await renderForm({ songs: [], albums: [] })
    await expect.element(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })

  it('stays cancellable when submitted without a song or album', async () => {
    const { screen, handlers } = await renderForm({ songs: [], albums: [] })
    await screen.getByLabelText('Page address').fill('anything')
    screen.getByRole('dialog').element().closest('form').requestSubmit()

    await screen.getByRole('button', { name: 'Cancel' }).click()
    expect(handlers.onCancel).toHaveBeenCalledOnce()
    expect(handlers.onCreate).not.toHaveBeenCalled()
  })
})
