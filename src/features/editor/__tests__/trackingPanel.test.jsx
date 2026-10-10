import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../lib/theme.js'
import TrackingPanel from '../components/TrackingPanel.js'
import EditorTabs from '../components/EditorTabs.js'

afterEach(cleanup)

describe('smart-link tracking settings', () => {
  it('validates settings, saves selected conversions and allows disabling tracking', async () => {
    const onChange = vi.fn()
    const screen = await render(<ThemeProvider theme={theme}><TrackingPanel value={null} onChange={onChange} /></ThemeProvider>)
    await screen.getByRole('textbox', { name: 'Meta Pixel ID' }).fill('bad')
    await screen.getByRole('button', { name: 'Save tracking settings' }).click()
    expect(onChange).not.toHaveBeenCalled()
    await expect.element(screen.getByText('Enter a valid numeric Meta Pixel ID.')).toBeVisible()
    await screen.getByRole('textbox', { name: 'Meta Pixel ID' }).fill('123456789012345')
    await screen.getByRole('button', { name: 'Save tracking settings' }).click()
    expect(onChange).toHaveBeenCalledWith({ pixelId: '123456789012345', platforms: expect.arrayContaining(['spotify', 'apple']) })
    await screen.getByRole('button', { name: 'Disable Meta tracking' }).click()
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('offers Tracking only for smart links', async () => {
    let screen = await render(<ThemeProvider theme={theme}><EditorTabs value="build" onChange={vi.fn()} pageType="main" /></ThemeProvider>)
    expect(screen.getByRole('tab', { name: 'Tracking' }).elements()).toHaveLength(0)
    await cleanup()
    screen = await render(<ThemeProvider theme={theme}><EditorTabs value="build" onChange={vi.fn()} pageType="release" /></ThemeProvider>)
    await expect.element(screen.getByRole('tab', { name: 'Tracking' })).toBeVisible()
  })
})
