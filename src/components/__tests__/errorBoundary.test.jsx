import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../lib/theme.js'
import ErrorBoundary from '../ErrorBoundary.jsx'

function Fragile({ failing }) {
  if (failing.current) throw new Error('render failed')
  return <p>Fragile content</p>
}

function renderBoundary(failing, resetKey = 'a') {
  return render(
    <ThemeProvider theme={theme}>
      <ErrorBoundary resetKey={resetKey}><Fragile failing={failing} /></ErrorBoundary>
      <p>Outside content</p>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  // React reports caught render errors to console.error.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(async () => {
  await cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', async () => {
    const screen = await renderBoundary({ current: false })
    await expect.element(screen.getByText('Fragile content')).toBeInTheDocument()
    expect(screen.getByRole('alert').elements()).toHaveLength(0)
  })

  it('replaces only its own subtree with an alert when a child throws', async () => {
    const screen = await renderBoundary({ current: true })
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Something went wrong showing this part of the page.')
    await expect.element(screen.getByText('Outside content')).toBeInTheDocument()
    expect(screen.getByText('Fragile content').elements()).toHaveLength(0)
  })

  it('renders the children again on "Try again"', async () => {
    const failing = { current: true }
    const screen = await renderBoundary(failing)
    await expect.element(screen.getByRole('alert')).toBeInTheDocument()

    failing.current = false
    await screen.getByRole('button', { name: 'Try again' }).click()
    await expect.element(screen.getByText('Fragile content')).toBeInTheDocument()
    expect(screen.getByRole('alert').elements()).toHaveLength(0)
  })

  it('resets when its reset key changes', async () => {
    const failing = { current: true }
    const screen = await renderBoundary(failing, 'a')
    await expect.element(screen.getByRole('alert')).toBeInTheDocument()

    failing.current = false
    await screen.rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary resetKey="b"><Fragile failing={failing} /></ErrorBoundary>
        <p>Outside content</p>
      </ThemeProvider>,
    )
    await expect.element(screen.getByText('Fragile content')).toBeInTheDocument()
  })
})
