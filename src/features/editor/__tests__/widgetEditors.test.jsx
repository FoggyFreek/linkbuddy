import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import { WidgetEditor } from '../components/WidgetEditors.jsx'

const content = {
  songs: [
    {
      id: 1,
      title: 'First Song',
      artist: 'The Testers',
      links: [
        { label: 'Spotify', url: 'https://open.spotify.com/track/1' },
        { label: '', url: 'https://music.apple.com/album/1' },
      ],
    },
    { id: 2, title: 'Second Song', artist: null },
  ],
  products: [
    { id: 10, name: 'T-shirt', priceCents: 2000 },
    { id: 20, name: 'Vinyl', priceCents: 2500 },
  ],
}

afterEach(cleanup)

async function renderEditor(widget, props = {}) {
  const handlers = {
    onChange: vi.fn(),
    onUnfurl: vi.fn().mockResolvedValue({}),
    ...props,
  }
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <WidgetEditor widget={widget} content={content} {...handlers} />
    </ThemeProvider>,
  )
  return { screen, handlers }
}

describe('WidgetEditor', () => {
  it('renders the song editor', async () => {
    const { screen } = await renderEditor({ id: 'song', type: 'song', songId: 1 })
    await expect.element(screen.getByText(/Fetches the album art/)).toBeInTheDocument()
  })

  it("lists the song's links and hides the ones unticked", async () => {
    const widget = { id: 'song', type: 'song', songId: 1, hiddenLinks: [] }
    const { screen, handlers } = await renderEditor(widget)
    await expect.element(screen.getByRole('checkbox', { name: 'Spotify' })).toBeChecked()
    await screen.getByRole('checkbox', { name: 'music.apple.com' }).click()
    expect(handlers.onChange).toHaveBeenLastCalledWith({ ...widget, hiddenLinks: ['https://music.apple.com/album/1'] })
  })

  it('shows a hidden song link again when ticked', async () => {
    const widget = { id: 'song', type: 'song', songId: 1, hiddenLinks: ['https://open.spotify.com/track/1'] }
    const { screen, handlers } = await renderEditor(widget)
    await expect.element(screen.getByRole('checkbox', { name: 'Spotify' })).not.toBeChecked()
    await screen.getByRole('checkbox', { name: 'Spotify' }).click()
    expect(handlers.onChange).toHaveBeenLastCalledWith({ ...widget, hiddenLinks: [] })
  })

  it('resets hidden links when another song is picked', async () => {
    const widget = { id: 'song', type: 'song', songId: 1, hiddenLinks: ['https://open.spotify.com/track/1'] }
    const { screen, handlers } = await renderEditor(widget)
    await screen.getByLabelText('Song').click()
    await screen.getByRole('option', { name: 'Second Song' }).click()
    expect(handlers.onChange).toHaveBeenLastCalledWith({ ...widget, songId: 2, hiddenLinks: [] })
  })

  it('edits platform widget fields', async () => {
    const { screen, handlers } = await renderEditor({ id: 'platforms', type: 'platforms', songId: 1, title: null })
    await screen.getByLabelText('Title (optional)').fill('Listen everywhere')
    expect(handlers.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Listen everywhere' }))
  })

  it('edits gigs and applies the default limit for an empty value', async () => {
    const { screen, handlers } = await renderEditor({ id: 'gigs', type: 'gigs', title: 'Upcoming', limit: 5 })
    await screen.getByLabelText('Title (Upcoming Gigs)').fill('Tour')
    expect(handlers.onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tour' }))

    await screen.getByLabelText('Max gigs').fill('')
    expect(handlers.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10 }))
  })

  it('toggles merchandise and edits included product metadata', async () => {
    const widget = {
      id: 'merch', type: 'merch', title: null, shopUrl: null,
      items: [{ productId: 10, imageUrl: null, badge: null }],
    }
    const { screen, handlers } = await renderEditor(widget)

    await screen.getByRole('checkbox', { name: 'Vinyl' }).click()
    expect(handlers.onChange).toHaveBeenCalledWith(expect.objectContaining({
      items: [widget.items[0], { productId: 20, imageUrl: null, badge: null }],
    }))
    await screen.getByLabelText('Image URL (optional)').fill('https://img.example/shirt.jpg')
    expect(handlers.onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ productId: 10, imageUrl: 'https://img.example/shirt.jpg' })],
    }))
  })

  it('fills missing custom-link metadata without replacing an explicit label', async () => {
    const widget = {
      id: 'link', type: 'link', label: '', url: 'https://example.com',
      sublabel: null, imageUrl: null, icon: 'globe',
    }
    const onUnfurl = vi.fn().mockResolvedValue({
      title: 'Example title', siteName: 'Example', imageUrl: 'https://example.com/image.jpg',
    })
    const { screen, handlers } = await renderEditor(widget, { onUnfurl })

    await screen.getByRole('button', { name: 'Try fetch image & info from link' }).click()
    await expect.poll(() => handlers.onChange.mock.calls.length).toBe(1)
    expect(handlers.onChange).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Example title', sublabel: 'Example', imageUrl: 'https://example.com/image.jpg',
    }))
  })

  it('reports unfurl failures and recovers the fetch button', async () => {
    const widget = {
      id: 'link', type: 'link', label: 'Site', url: 'https://example.com',
      sublabel: null, imageUrl: null, icon: 'globe',
    }
    const { screen } = await renderEditor(widget, { onUnfurl: vi.fn().mockRejectedValue(new Error('Fetch failed')) })

    await screen.getByRole('button', { name: 'Try fetch image & info from link' }).click()
    await expect.element(screen.getByText('Fetch failed')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Try fetch image & info from link' })).not.toBeDisabled()
  })

  it('loads embed metadata and identifies the resolved renderer', async () => {
    const widget = { id: 'embed', type: 'embed', url: 'https://youtu.be/test', title: null, description: null, imageUrl: null }
    const onUnfurl = vi.fn().mockResolvedValue({
      title: 'Video', description: 'Description', imageUrl: 'https://img.example/video.jpg',
      embed: { type: 'youtube', src: 'https://youtube.com/embed/test' },
    })
    const { screen, handlers } = await renderEditor(widget, { onUnfurl })

    await screen.getByRole('button', { name: 'Load info' }).click()
    await expect.element(screen.getByText('Renders as: youtube')).toBeInTheDocument()
    expect(handlers.onChange).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Video', description: 'Description', imageUrl: 'https://img.example/video.jpg',
    }))
  })

  it('renders nothing for an unknown widget type', async () => {
    const { screen } = await renderEditor({ id: 'future', type: 'future' })
    expect(screen.container.childElementCount).toBe(0)
  })
})
