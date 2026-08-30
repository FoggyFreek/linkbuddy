import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../lib/theme.js'
import EditorTabs from '../components/EditorTabs.jsx'

afterEach(cleanup)

describe('EditorTabs', () => {
  it('exposes every editor view and reports the selected value', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <ThemeProvider theme={theme} defaultMode="light">
        <EditorTabs value="build" onChange={onChange} />
      </ThemeProvider>,
    )

    for (const name of ['Build', 'Appearance', 'Preview', 'Statistics']) {
      await expect.element(screen.getByRole('tab', { name })).toBeInTheDocument()
    }
    await screen.getByRole('tab', { name: 'Appearance' }).click()
    expect(onChange.mock.calls[0][1]).toBe('appearance')
  })
})
