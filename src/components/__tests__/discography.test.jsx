import { afterEach, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../lib/theme.js'
import DiscographyWidget from '../widgets/DiscographyWidget.js'

afterEach(cleanup)

const albums = [
  { id: 1, title: 'First Light', artist: 'The Band', releaseDate: '2020-05-21', coverUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' },
  { id: 2, title: 'High Res Only', artist: 'The Band', releaseDate: null, coverUrl: null, coverHighResolutionUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' },
  { id: 3, title: 'No Art', artist: 'The Band', releaseDate: '2024-11-01', coverUrl: null },
]

it('shows album titles and years over artwork in a navigable photo carousel', async () => {
  const screen = await render(<ThemeProvider theme={theme}><div style={{ width: 320 }}><DiscographyWidget widget={{ id: 'd', type: 'discography', title: 'Records', discography: albums }} onLinkClick={vi.fn()} /></div></ThemeProvider>)
  await expect.element(screen.getByRole('heading', { name: 'Records' })).toBeVisible()
  const carousel = screen.container.querySelector('[aria-roledescription="carousel"]')
  expect(getComputedStyle(carousel).scrollSnapType).toBe('x mandatory')
  const first = screen.container.querySelector('article')
  for (const card of screen.container.querySelectorAll('article')) {
    expect(card.offsetHeight).toBe(card.offsetWidth)
    expect(getComputedStyle(card).borderRadius).toBe('0px')
  }
  expect(first.querySelector('img').offsetWidth).toBe(first.offsetWidth)
  expect(first.querySelector('img').offsetHeight).toBe(first.offsetHeight)
  expect(first.querySelector('img').alt).toBe('First Light album art')
  expect(first.querySelector('img').src).toBe(albums[0].coverUrl)
  expect(first.textContent).toContain('First Light')
  expect(parseFloat(getComputedStyle(first.querySelector('p')).fontSize)).toBeLessThan(16)
  expect(first.textContent).toContain('2020')
  expect(first.querySelector('time').dateTime).toBe('2020-05-21')
  expect(first.querySelector('time').compareDocumentPosition(first.querySelector('img'))).toBe(Node.DOCUMENT_POSITION_PRECEDING)
  expect(screen.container.querySelectorAll('article')[1].querySelector('img').src).toBe(albums[1].coverHighResolutionUrl)
  expect(screen.container.querySelectorAll('article')[2].textContent).toContain('No Art')
  await screen.getByRole('button', { name: 'Go to album 1' }).click()
  carousel.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(screen.container.querySelectorAll('[data-carousel-dot]')[1].getAttribute('aria-current')).toBe('true'))
  await screen.getByRole('button', { name: 'Next album' }).click()
  await vi.waitFor(() => expect(screen.container.querySelectorAll('[data-carousel-dot]')[2].getAttribute('aria-current')).toBe('true'))
})

it('hides navigation controls for one album', async () => {
  const screen = await render(<ThemeProvider theme={theme}><DiscographyWidget widget={{ id: 'd', type: 'discography', title: 'Discography', discography: albums.slice(0, 1) }} onLinkClick={vi.fn()} /></ThemeProvider>)
  expect(screen.container.querySelectorAll('[data-carousel-dot]')).toHaveLength(0)
  expect(screen.container.querySelector('[aria-label="Next album"]')).toBeNull()
})
