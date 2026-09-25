import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../lib/theme.js'
import PreviewContent from '../PreviewContent.jsx'

// Sections breathe twice the gap of the widgets inside them, on both page kinds.
const link = (id) => ({ id, type: 'link', label: `Link ${id}`, url: 'https://example.com', icon: 'globe' })
const sections = [
  { id: 's1', widgets: [link('a'), link('b')] },
  { id: 's2', widgets: [link('c')] },
]
const band = { name: 'Neon Harbour', slug: 'neon-harbour', socials: {} }

afterEach(cleanup)

async function measure(page) {
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <PreviewContent page={page} />
    </ThemeProvider>,
  )
  await expect.element(screen.getByText('Link c')).toBeInTheDocument()
  const [first, second] = [...document.querySelectorAll('section')]
  const cards = first.querySelectorAll(':scope > *')
  return {
    betweenSections: second.getBoundingClientRect().top - first.getBoundingClientRect().bottom,
    betweenWidgets: cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom,
  }
}

describe('section spacing', () => {
  it('separates band page sections by 28px, widgets by 14px', async () => {
    const gaps = await measure({ band, sections })
    expect(gaps.betweenWidgets).toBeCloseTo(14, 0)
    expect(gaps.betweenSections).toBeCloseTo(28, 0)
  })

  it('separates release page sections by 28px, widgets by 14px', async () => {
    const gaps = await measure({ band, release: { title: 'Midnight Signal', artist: 'Neon Harbour' }, sections })
    expect(gaps.betweenWidgets).toBeCloseTo(14, 0)
    expect(gaps.betweenSections).toBeCloseTo(28, 0)
  })
})
