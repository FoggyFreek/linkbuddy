import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../lib/theme.js'

const layout = {
  background: 'none', font: 'inter', showBanner: true, theme: null,
  sections: [{ id: 'section-1', title: 'Links', widgets: [] }],
}
const content = {
  band: { name: 'The Testers', slug: 'the-testers', bannerUrl: 'https://img.example/banner.jpg', socials: {} },
  songs: [{ id: 11, title: 'First Single', artist: 'The Testers', links: [] }],
  products: [{ id: 21, name: 'T-shirt', priceCents: 2000 }],
}
const mainPage = {
  id: 1, slug: 'the-testers', pageType: 'main', release: null, publishedAt: null,
  draftLayout: layout, contentSyncedAt: null, content, publicUrl: 'https://links.example/the-testers',
}
const releasePage = {
  ...mainPage, id: 2, slug: 'the-testers/first-single', pageType: 'release',
  release: { songId: 11, title: 'First Single', artist: 'The Testers' },
  publicUrl: 'https://links.example/the-testers/first-single',
}
const createdPage = {
  ...releasePage, id: 3, slug: 'the-testers/new-release',
  release: { songId: 11, title: 'New Release', artist: 'The Testers' },
  publicUrl: 'https://links.example/the-testers/new-release',
}
const pageEntries = [mainPage, releasePage].map(({ draftLayout: _layout, content: _content, contentSyncedAt: _synced, publicUrl: _url, ...entry }) => entry)

const api = {
  getStoredSession: vi.fn(() => 'session-token'),
  storeSession: vi.fn(),
  exchangeHandoff: vi.fn(),
  listEditorPages: vi.fn(async () => ({ pages: pageEntries })),
  getEditorPage: vi.fn(async (_session, id) => id === 2 ? releasePage : mainPage),
  saveDraft: vi.fn(async () => ({ saved: true })),
  unfurlUrl: vi.fn(async () => ({})),
  createReleasePage: vi.fn(async () => ({ page: createdPage })),
  deleteEditorPage: vi.fn(async () => null),
  getPreview: vi.fn(async () => ({
    band: content.band, release: null, background: 'none', font: 'inter',
    showBanner: true, theme: 'light', sections: [],
  })),
  publishPage: vi.fn(async () => ({ publishedAt: '2026-08-30T10:00:00.000Z' })),
  refreshContent: vi.fn(async () => ({
    ...mainPage, content: { ...content, band: { ...content.band, name: 'The Refreshed Testers' } },
  })),
  getStats: vi.fn(async () => ({
    enabled: true, retentionDays: 30, totalViews: 0, uniqueVisits: 0, totalClicks: 0,
    clickThroughRate: null, byDay: [], byDevice: [], bySource: [], byCountry: [],
    byPlatform: [], byTarget: [], conversionBySource: [],
  })),
}

vi.mock('../../lib/api.js', () => api)
const { default: Editor } = await import('../routes/Editor.jsx')

beforeEach(() => {
  window.history.replaceState(null, '', '/edit')
  for (const value of Object.values(api)) value.mockClear()
  api.getStoredSession.mockReturnValue('session-token')
  api.listEditorPages.mockResolvedValue({ pages: pageEntries })
  api.getEditorPage.mockImplementation(async (_session, id) => id === 2 ? releasePage : mainPage)
  api.saveDraft.mockResolvedValue({ saved: true })
  api.createReleasePage.mockResolvedValue({ page: createdPage })
  api.getPreview.mockResolvedValue({
    band: content.band, release: null, background: 'none', font: 'inter',
    showBanner: true, theme: 'light', sections: [],
  })
  api.publishPage.mockResolvedValue({ publishedAt: '2026-08-30T10:00:00.000Z' })
  api.refreshContent.mockResolvedValue({
    ...mainPage, content: { ...content, band: { ...content.band, name: 'The Refreshed Testers' } },
  })
})

afterEach(async () => {
  await cleanup()
  vi.restoreAllMocks()
})

async function renderEditor({ strict = false } = {}) {
  const editor = (
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <Editor />
    </ThemeProvider>
  )
  return render(strict ? <StrictMode>{editor}</StrictMode> : editor)
}

describe('Editor workflow', () => {
  it('exchanges a single-use handoff exactly once and clears it from the address bar', async () => {
    window.history.replaceState(null, '', '/edit#gbtoken=handoff-token')
    api.getStoredSession.mockReturnValue(null)
    api.exchangeHandoff.mockResolvedValue({ session: 'fresh-session', pages: pageEntries, page: mainPage })

    const screen = await renderEditor({ strict: true })

    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()
    expect(api.exchangeHandoff).toHaveBeenCalledTimes(1)
    expect(api.exchangeHandoff).toHaveBeenCalledWith('handoff-token')
    expect(api.storeSession).toHaveBeenCalledWith('fresh-session')
    expect(window.location.hash).toBe('')
  })

  it('loads the main page, publishes it, refreshes content, and adds a section', async () => {
    const screen = await renderEditor()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Publish' }).click()
    await expect.poll(() => api.publishPage.mock.calls.length).toBe(1)
    await expect.element(screen.getByRole('button', { name: 'Publish changes' })).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Refresh content' }).click()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Refreshed Testers' })).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Add section' }).click()
    expect(screen.getByPlaceholder('Section title (optional)').elements()).toHaveLength(2)
  })

  it('loads preview and statistics tabs through their API boundaries', async () => {
    const screen = await renderEditor()
    await expect.element(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Preview' }).click()
    await expect.poll(() => api.getPreview.mock.calls.length).toBe(1)
    await expect.element(screen.getByText('Preview of the public page content.')).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Statistics' }).click()
    await expect.poll(() => api.getStats.mock.calls.length).toBe(1)
    expect(api.getStats).toHaveBeenCalledWith('session-token', 1, 30)
    await expect.element(screen.getByRole('heading', { name: 'Links and actions' })).toBeInTheDocument()
  })

  it('keeps the editor usable when a tab fails to render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getStats.mockResolvedValueOnce({})
    const screen = await renderEditor()
    await expect.element(screen.getByRole('tab', { name: 'Statistics' })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Statistics' }).click()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Something went wrong showing this part of the page.')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'The Testers' })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'Build' }).click()
    await expect.element(screen.getByRole('button', { name: 'Add section' })).toBeInTheDocument()
    expect(screen.getByRole('alert').elements()).toHaveLength(0)
  })

  it('switches pages after flushing the draft and deletes a release confirmed in a dialog', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const screen = await renderEditor()
    await expect.element(screen.getByRole('tab', { name: /First Single/ })).toBeInTheDocument()

    await screen.getByRole('tab', { name: /First Single/ }).click()
    await expect.element(screen.getByText('release page')).toBeInTheDocument()
    expect(api.getEditorPage).toHaveBeenCalledWith('session-token', 2)

    await screen.getByRole('button', { name: 'Delete page' }).click()
    await screen.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
    expect(api.deleteEditorPage).not.toHaveBeenCalled()
    expect(screen.getByText('release page', { exact: true }).elements()).toHaveLength(1)

    await screen.getByRole('button', { name: 'Delete page' }).click()
    await screen.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect.poll(() => api.deleteEditorPage.mock.calls.length).toBe(1)
    expect(api.deleteEditorPage).toHaveBeenCalledWith('session-token', 2)
    await expect.element(screen.getByText('link page')).toBeInTheDocument()
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /First Single/ }).elements()).toHaveLength(0)
    expect(nativeConfirm).not.toHaveBeenCalled()
  })

  it('keeps the release page open when its deletion fails', async () => {
    api.deleteEditorPage.mockRejectedValueOnce(new Error('Delete failed'))
    const screen = await renderEditor()
    await screen.getByRole('tab', { name: /First Single/ }).click()
    await expect.element(screen.getByText('release page')).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Delete page' }).click()
    await screen.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect.element(screen.getByRole('dialog').getByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByText('release page', { exact: true }).elements()).toHaveLength(1)
  })

  it('creates a release page from the page switcher', async () => {
    const screen = await renderEditor()
    await expect.element(screen.getByRole('tab', { name: 'New release page' })).toBeInTheDocument()

    await screen.getByRole('tab', { name: 'New release page' }).click()
    await screen.getByRole('button', { name: 'Create' }).click()

    await expect.poll(() => api.createReleasePage.mock.calls.length).toBe(1)
    expect(api.createReleasePage).toHaveBeenCalledWith('session-token', { songId: 11 }, 'the-testers/first-single')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'New Release' })).toBeInTheDocument()
  })
})
