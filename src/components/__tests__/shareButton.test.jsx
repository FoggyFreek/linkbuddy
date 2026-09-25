import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../lib/theme.js'
import ShareButton from '../ShareButton.jsx'
import PoweredByGigBuddy from '../PoweredByGigBuddy.jsx'

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share')
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(async () => {
  await cleanup()
  vi.restoreAllMocks()
  if (originalShare) Object.defineProperty(navigator, 'share', originalShare)
  else delete navigator.share
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else delete navigator.clipboard
})

async function renderShare(props = {}) {
  const onShare = vi.fn()
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <ShareButton url="https://links.example/band" title="The Testers" onShare={onShare} {...props} />
    </ThemeProvider>,
  )
  return { screen, onShare }
}

describe('ShareButton', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    const { screen, onShare } = await renderShare()

    await screen.getByRole('button', { name: 'Share this page' }).click()
    await screen.getByRole('menuitem', { name: 'Share…' }).click()

    expect(share).toHaveBeenCalledWith({ title: 'The Testers', url: 'https://links.example/band' })
    expect(onShare).toHaveBeenCalledWith('native')
  })

  it('opens external channels with an encoded share URL', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { screen, onShare } = await renderShare({ variant: 'corner' })

    await screen.getByRole('button', { name: 'Share this page' }).click()
    await screen.getByRole('menuitem', { name: 'WhatsApp' }).click()

    expect(open).toHaveBeenCalledWith(
      'https://wa.me/?text=The%20Testers%20https%3A%2F%2Flinks.example%2Fband',
      '_blank',
      'noopener',
    )
    expect(onShare).toHaveBeenCalledWith('whatsapp')
  })

  it('copies the link and confirms success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { screen, onShare } = await renderShare({ variant: 'inline' })

    await screen.getByRole('button', { name: 'Share this page' }).click()
    await screen.getByRole('menuitem', { name: 'Copy link' }).click()

    expect(writeText).toHaveBeenCalledWith('https://links.example/band')
    expect(onShare).toHaveBeenCalledWith('copy')
    await expect.element(screen.getByText('Link copied')).toBeInTheDocument()
  })

  it('closes cleanly when clipboard access fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const { screen } = await renderShare()

    await screen.getByRole('button', { name: 'Share this page' }).click()
    await screen.getByRole('menuitem', { name: 'Copy link' }).click()
    expect(screen.getByText('Link copied').elements()).toHaveLength(0)
  })
})

describe('PoweredByGigBuddy', () => {
  it('stays hidden without an upstream URL', async () => {
    const screen = await render(<PoweredByGigBuddy />)
    expect(screen.getByRole('link', { name: 'powered by gigBuddy' }).elements()).toHaveLength(0)
  })

  it('renders the inline attribution as a safe external link', async () => {
    const screen = await render(
      <ThemeProvider theme={theme} defaultMode="light">
        <PoweredByGigBuddy href="https://gigbuddy.example" variant="inline" />
      </ThemeProvider>,
    )
    const link = screen.getByRole('link', { name: 'powered by gigBuddy' })
    await expect.element(link).toHaveAttribute('href', 'https://gigbuddy.example')
    await expect.element(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
