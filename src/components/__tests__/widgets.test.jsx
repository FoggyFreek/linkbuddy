import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../lib/theme.js'
import GigsWidget from '../widgets/GigsWidget.jsx'
import SongWidget from '../widgets/SongWidget.jsx'
import MerchWidget from '../widgets/MerchWidget.jsx'
import { LINK_ICON_COMPONENTS, PLATFORM_ICON_COMPONENTS } from '../icons.jsx'

afterEach(cleanup)

function withTheme(node) {
  return (
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>
  )
}

describe('visitor widgets', () => {
  it('renders every registered platform and custom-link icon', async () => {
    const icons = [...Object.values(PLATFORM_ICON_COMPONENTS), ...Object.values(LINK_ICON_COMPONENTS)]
    const screen = await render(withTheme(
      <div>{icons.map((Icon, index) => <Icon key={index} size={20} />)}</div>,
    ))
    expect(screen.container.querySelectorAll('svg')).toHaveLength(icons.length)
  })

  it('renders the empty gigs state', async () => {
    const screen = await render(withTheme(<GigsWidget widget={{ type: 'gigs', title: 'Shows', gigs: [] }} onLinkClick={vi.fn()} />))
    await expect.element(screen.getByText('No upcoming gigs announced — check back soon.')).toBeInTheDocument()
  })

  it('renders gig details and reports event-link clicks', async () => {
    const onLinkClick = vi.fn()
    const widget = {
      type: 'gigs', title: 'Shows', gigs: [
        { id: 1, title: 'Release Party', date: '2026-09-12', venue: 'Paradiso', city: 'Amsterdam', eventUrl: 'https://tickets.example/party' },
        { id: 2, title: 'Acoustic Set', date: '2026-10-03', venue: null, city: null, eventUrl: null },
      ],
    }
    const screen = await render(withTheme(<GigsWidget widget={widget} onLinkClick={onLinkClick} />))

    await expect.element(screen.getByText('Shows (2 gigs)')).toBeInTheDocument()
    await expect.element(screen.getByText('Paradiso, Amsterdam')).toBeInTheDocument()
    await screen.getByRole('link', { name: /Event page for Release Party/ }).click()
    expect(onLinkClick).toHaveBeenCalledWith('gig:Release Party')
  })

  it('renders primary, platform, and fallback song links', async () => {
    const onLinkClick = vi.fn()
    const widget = {
      type: 'song', title: 'New Single', artist: 'The Testers', coverUrl: null,
      links: [
        { url: 'https://spotify.example/primary', label: 'Listen', platform: { id: 'spotify', label: 'Spotify' } },
        { url: 'https://youtube.example/video', label: 'Watch', platform: { id: 'youtube', label: 'YouTube' } },
        { url: 'https://other.example/play', label: 'Band site', platform: { id: 'other', label: 'Other' } },
      ],
    }
    const screen = await render(withTheme(<SongWidget widget={widget} onLinkClick={onLinkClick} />))

    await screen.getByRole('link', { name: /New Single/ }).click()
    await screen.getByRole('link', { name: 'YouTube' }).click()
    await screen.getByRole('link', { name: 'Band site' }).click()
    expect(onLinkClick.mock.calls).toEqual([['song:Listen'], ['platform:youtube'], ['song:Band site']])
  })

  it('renders merchandise with optional artwork, badge, and shop behavior', async () => {
    const onLinkClick = vi.fn()
    const widget = {
      type: 'merch', title: 'Merch', shopUrl: 'https://shop.example', products: [
        { id: 1, name: 'Vinyl', priceCents: 2599, imageUrl: 'https://img.example/vinyl.jpg', badge: 'NEW' },
        { id: 2, name: 'T-shirt', priceCents: null, imageUrl: null, badge: null },
      ],
    }
    const screen = await render(withTheme(<MerchWidget widget={widget} onLinkClick={onLinkClick} />))

    await expect.element(screen.getByText('€ 25,99')).toBeInTheDocument()
    await expect.element(screen.getByText('NEW')).toBeInTheDocument()
    await screen.getByRole('link', { name: /Vinyl/ }).click()
    expect(onLinkClick).toHaveBeenCalledWith('shop')
  })

  it('keeps merchandise non-clickable without a shop URL', async () => {
    const widget = {
      type: 'merch', title: null, shopUrl: null,
      products: [{ id: 1, name: 'Sticker', priceCents: 200, imageUrl: null, badge: null }],
    }
    const screen = await render(withTheme(<MerchWidget widget={widget} onLinkClick={vi.fn()} />))
    await expect.element(screen.getByText('Sticker')).toBeInTheDocument()
    expect(screen.getByRole('link').elements()).toHaveLength(0)
  })
})
