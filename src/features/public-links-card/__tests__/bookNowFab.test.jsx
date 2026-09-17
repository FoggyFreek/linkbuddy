import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import BookNowFab from '../components/BookNowFab.jsx'

const fullBooking = {
  email: 'book@woods.example',
  phone: '+31 6 12345678',
  feeLowCents: 50000,
  feeHighCents: 120000,
  currency: 'EUR',
  repertoire: 'covers',
}

// Fees are formatted in the visitor's own locale, so the expected string is
// built the same way rather than pinned to one locale's separators.
function money(cents, currency = 'EUR') {
  const fraction = cents % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(cents / 100).replace(/ /g, ' ')
}

afterEach(cleanup)

async function renderFab(booking, props = {}) {
  const onLinkClick = vi.fn()
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <BookNowFab booking={booking} bandName="The Woods" onLinkClick={onLinkClick} {...props} />
    </ThemeProvider>,
  )
  return { screen, onLinkClick }
}

describe('BookNowFab', () => {
  it('stays hidden when the band published no booking block', async () => {
    const { screen } = await renderFab(null)
    expect(screen.getByRole('button', { name: 'Book now' }).elements()).toHaveLength(0)
  })

  it('opens a dialog with the fee indication, repertoire and both contacts', async () => {
    const { screen, onLinkClick } = await renderFab(fullBooking)

    await screen.getByRole('button', { name: 'Book now' }).click()

    const dialog = screen.getByRole('dialog')
    await expect.element(dialog).toBeInTheDocument()
    await expect.element(screen.getByText('Book The Woods')).toBeInTheDocument()
    await expect.element(screen.getByText(`${money(50000)} – ${money(120000)}`)).toBeInTheDocument()
    await expect.element(screen.getByText('Mainly plays:')).toBeInTheDocument()
    await expect.element(screen.getByText('Covers')).toBeInTheDocument()
    await expect.element(screen.getByRole('link', { name: /book@woods.example/ }))
      .toHaveAttribute('href', 'mailto:book@woods.example')
    await expect.element(screen.getByRole('link', { name: /\+31 6 12345678/ }))
      .toHaveAttribute('href', 'tel:+31612345678')
    expect(onLinkClick).toHaveBeenCalledWith('book:open')
  })

  it('reports the contact a visitor acted on', async () => {
    // mailto:/tel: are handed to the OS; swallow the navigation so the test
    // browser stays on the page while the beacon is asserted.
    const swallow = (event) => event.preventDefault()
    document.addEventListener('click', swallow, true)
    try {
      const { screen, onLinkClick } = await renderFab(fullBooking)
      await screen.getByRole('button', { name: 'Book now' }).click()

      await screen.getByRole('link', { name: /book@woods.example/ }).click()
      expect(onLinkClick).toHaveBeenCalledWith('book:email')

      await screen.getByRole('link', { name: /\+31 6 12345678/ }).click()
      expect(onLinkClick).toHaveBeenCalledWith('book:phone')
    } finally {
      document.removeEventListener('click', swallow, true)
    }
  })

  it('reads as an open-ended range when only the floor of the fee is set', async () => {
    const { screen } = await renderFab({ ...fullBooking, feeHighCents: null })
    await screen.getByRole('button', { name: 'Book now' }).click()
    await expect.element(screen.getByText(`From ${money(50000)}`)).toBeInTheDocument()
  })

  it('reads as an open-ended range when only the ceiling of the fee is set', async () => {
    const { screen } = await renderFab({ ...fullBooking, feeLowCents: null })
    await screen.getByRole('button', { name: 'Book now' }).click()
    await expect.element(screen.getByText(`Up to ${money(120000)}`)).toBeInTheDocument()
  })

  it('falls back to an invitation to get in touch when no fee is published', async () => {
    const { screen } = await renderFab({ ...fullBooking, feeLowCents: null, feeHighCents: null, repertoire: null })
    await screen.getByRole('button', { name: 'Book now' }).click()

    await expect.element(screen.getByText('Contact for more information.')).toBeInTheDocument()
    expect(screen.getByText('Fee indication').elements()).toHaveLength(0)
  })

  it('draws attention on arrival, and stops once the visitor has looked', async () => {
    const { screen } = await renderFab(fullBooking)

    // The attention rings are decorative: out of the accessibility tree, and
    // never in the way of a tap on the button underneath.
    const pulse = screen.getByTestId('book-now-pulse')
    await expect.element(pulse).toHaveAttribute('aria-hidden')
    expect(getComputedStyle(pulse.element()).pointerEvents).toBe('none')
    // The choreography is CSS on a delay, so it survives a re-render.
    expect(getComputedStyle(pulse.element()).animationName).toBe('lbFabRing')
    const fab = screen.getByRole('button', { name: 'Book now' }).element()
    expect(getComputedStyle(fab).animationName).toBe('lbFabEnter, lbFabWiden')

    await screen.getByRole('button', { name: 'Book now' }).click()
    expect(screen.getByTestId('book-now-pulse').elements()).toHaveLength(0)
  })

  it('omits a contact the band did not publish', async () => {
    const { screen } = await renderFab({ ...fullBooking, phone: null })
    await screen.getByRole('button', { name: 'Book now' }).click()

    await expect.element(screen.getByRole('link', { name: /book@woods.example/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+31/ }).elements()).toHaveLength(0)
  })

  it('shows the fee in the band’s own currency', async () => {
    const { screen } = await renderFab({ ...fullBooking, currency: 'GBP', feeLowCents: 50000, feeHighCents: null })
    await screen.getByRole('button', { name: 'Book now' }).click()
    await expect.element(screen.getByText(`From ${money(50000, 'GBP')}`)).toBeInTheDocument()
  })
})
