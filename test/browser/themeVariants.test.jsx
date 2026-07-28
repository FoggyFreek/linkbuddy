import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import theme from '../../src/lib/theme.js'

// The pill (dashed add-button) and panel (editor content card) variants live in
// the theme now instead of being repeated in each component's sx. These render
// the real MUI components against the theme and assert the variant styling
// actually reaches the DOM, so the shared definitions can't silently break.

async function renderNode(node) {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {node}
    </ThemeProvider>,
  )
}

describe('theme component variants', () => {
  it('renders the pill button variant with a dashed, fully-rounded border', async () => {
    const screen = await renderNode(<Button variant="pill">Song</Button>)
    const btn = screen.getByRole('button', { name: 'Song' }).element()
    const style = getComputedStyle(btn)
    expect(style.borderTopStyle).toBe('dashed')
    // The 999px pill radius resolves far beyond the base card radius.
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(100)
  })

  it('applies the shared inset to the panel card variant', async () => {
    const screen = await renderNode(<Card variant="panel" data-testid="panel">body</Card>)
    await expect.element(screen.getByTestId('panel')).toBeInTheDocument()
    const style = getComputedStyle(document.querySelector('[data-testid="panel"]'))
    expect(style.paddingTop).toBe('14px')
    expect(style.paddingLeft).toBe('16px')
  })
})
