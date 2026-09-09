import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import BandHeader from '../components/BandHeader.jsx'

// The band header's measurements: the bio column is deliberately narrower than
// the card so it wraps into short lines, and the social row sits tight.
const band = {
  name: 'Neon Harbour',
  slug: 'neon-harbour',
  bio: 'Loud, clear, and cookie-free.',
  socials: { instagram: 'neon', facebook: 'neon', youtube: 'neon' },
}

function renderHeader() {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <BandHeader band={band} onLinkClick={() => {}} />
    </ThemeProvider>,
  )
}

describe('BandHeader spacing', () => {
  it('keeps the bio in a narrow column', async () => {
    const screen = await renderHeader()
    const bio = screen.getByText('Loud, clear, and cookie-free.')
    await expect.element(bio).toBeInTheDocument()
    expect(getComputedStyle(bio.element()).maxWidth).toBe('360px')
  })

  it('leaves 11px between the social icons', async () => {
    const screen = await renderHeader()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    const links = [...document.querySelectorAll('header a[aria-label]')]
    expect(links.length).toBe(3)
    const [a, b] = links.map((el) => el.getBoundingClientRect())
    expect(b.left - a.right).toBeCloseTo(11, 0)
  })
})
