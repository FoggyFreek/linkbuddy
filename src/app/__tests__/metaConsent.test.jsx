import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../lib/theme.js'
import ReleasePage from '../routes/ReleasePage.js'
import BandPage from '../routes/BandPage.js'
import PreviewContent from '../../components/PreviewContent.js'
import Privacy from '../routes/Privacy.js'

const state = { page: null, clicks: [] }

const settings = { pixelId: '123456789012345', platforms: ['spotify'], releaseId: 'song:12' }
const releasePage = {
  band: { name: 'The Testers' }, release: { title: 'Single', kind: 'song' },
  sections: [{ id: 's', widgets: [{ id: 'w', type: 'platforms', platforms: [
    { id: 'spotify', label: 'Spotify', url: '#spotify', iconKey: 'spotify' },
    { id: 'apple', label: 'Apple Music', url: '#apple', iconKey: 'apple' },
  ] }] }],
  metaTracking: settings,
}

function show(Component = ReleasePage, slug = 'testers/single') {
  return render(<ThemeProvider theme={theme}><Component slug={slug} /></ThemeProvider>)
}

async function changeConsentInOtherWindow(action, key, choice = 'rejected') {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    const storageEvent = new Promise((resolve) => window.addEventListener('storage', resolve, { once: true }))
    const storage = frame.contentWindow.localStorage
    if (action === 'clear') storage.clear()
    else if (action === 'remove') storage.removeItem(key)
    else storage.setItem(key, JSON.stringify({ version: 1, choice, at: Date.now() }))
    await storageEvent
  } finally {
    frame.remove()
  }
}

beforeEach(() => {
  state.page = releasePage
  state.clicks = []
  localStorage.clear()
  window.fbq = vi.fn()
  vi.spyOn(navigator, 'sendBeacon').mockReturnValue(false)
  vi.spyOn(window, 'fetch').mockImplementation(async (url, options) => {
    if (String(url).endsWith('/click')) state.clicks.push(JSON.parse(options.body).target)
    if (options?.method === 'POST') return new Response(null, { status: 204 })
    return new Response(JSON.stringify(state.page), { headers: { 'Content-Type': 'application/json' } })
  })
})
afterEach(async () => {
  await cleanup()
  localStorage.clear()
  delete window.fbq
  document.querySelector('[data-linkbuddy-meta-pixel]')?.remove()
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

describe('smart-link advertising consent', () => {
  it('requests consent before loading Meta and gives equal accept/reject controls', async () => {
    const screen = await show()
    const dialog = screen.getByRole('dialog', { name: 'Your privacy matters to us' })
    await expect.element(dialog).toBeVisible()
    await expect.element(dialog).toHaveTextContent(/uses optional cookies to measure visits and statistics/)
    expect(dialog.element().textContent).not.toMatch(/Facebook|Instagram/)
    await expect.element(screen.getByText('Optional advertising cookies, with your consent.')).toBeInTheDocument()
    expect(window.fbq).not.toHaveBeenCalled()
    expect(document.querySelector('[data-linkbuddy-meta-pixel]')).toBeNull()
    const accept = screen.getByRole('button', { name: 'Accept marketing cookies' }).element().getBoundingClientRect()
    const reject = screen.getByRole('button', { name: 'Reject marketing cookies' }).element().getBoundingClientRect()
    expect([accept.width, accept.height]).toEqual([reject.width, reject.height])
  })

  it('shows the consent notice as a full-width, square-cornered banner', async () => {
    const screen = await show()
    const dialog = screen.getByRole('dialog', { name: 'Your privacy matters to us' })
    await expect.element(dialog).toBeVisible()
    const paper = dialog.element()
    await vi.waitFor(() => expect(paper.getBoundingClientRect().width).toBe(document.documentElement.clientWidth))
    expect(getComputedStyle(paper).borderRadius).toBe('0px')
    for (const name of ['Accept marketing cookies', 'Reject marketing cookies']) {
      const button = screen.getByRole('button', { name }).element()
      expect(button.getBoundingClientRect().width).toBe(paper.getBoundingClientRect().width)
      expect(getComputedStyle(button).borderRadius).toBe('0px')
    }
    const reject = screen.getByRole('button', { name: 'Reject marketing cookies' }).element().getBoundingClientRect()
    const accept = screen.getByRole('button', { name: 'Accept marketing cookies' }).element().getBoundingClientRect()
    expect(accept.top).toBe(reject.bottom)
  })

  it('accepts, tracks only selected platforms once, then stops on withdrawal', async () => {
    const screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView'))
    await screen.getByRole('link', { name: /Spotify/ }).click()
    await screen.getByRole('link', { name: /Apple Music/ }).click()
    const conversions = window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')
    expect(conversions).toHaveLength(1)
    expect(conversions[0]).toEqual(['trackSingleCustom', settings.pixelId, 'SmartLinkClick', { release_id: 'song:12', platform: 'spotify' }, { eventID: expect.any(String) }])
    expect(state.clicks).toEqual(['platform:spotify', 'platform:apple'])
    await screen.getByRole('button', { name: 'Cookie settings' }).click()
    await screen.getByRole('button', { name: 'Reject marketing cookies' }).click()
    expect(window.fbq).toHaveBeenCalledWith('consent', 'revoke')
    await screen.getByRole('link', { name: /Spotify/ }).click()
    expect(window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')).toHaveLength(1)
  })


  it.each(['reject', 'remove', 'clear'])('stops tracking when another window changes consent: %s', async (action) => {
    const screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView'))
    document.cookie = '_fbp=test; Path=/'
    document.cookie = '_fbc=test; Path=/'
    const key = `lb_meta_consent:testers%2Fsingle:${settings.pixelId}`
    await changeConsentInOtherWindow(action, key)
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('consent', 'revoke'))
    expect(document.cookie).not.toContain('_fbp=')
    expect(document.cookie).not.toContain('_fbc=')
    if (action !== 'reject') {
      await expect.element(screen.getByRole('dialog')).toBeVisible()
      await screen.getByRole('button', { name: 'Reject marketing cookies' }).click()
    }
    await screen.getByRole('link', { name: /Spotify/ }).click()
    expect(window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')).toHaveLength(0)
    expect(state.clicks).toEqual(['platform:spotify'])
  })

  it('ignores another smart link’s consent and restores tracking after acceptance in another window', async () => {
    const screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView'))
    await changeConsentInOtherWindow('reject', `lb_meta_consent:another%2Frelease:${settings.pixelId}`)
    await screen.getByRole('link', { name: /Spotify/ }).click()
    expect(window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')).toHaveLength(1)
    expect(window.fbq).not.toHaveBeenCalledWith('consent', 'revoke')
    await screen.getByRole('button', { name: 'Cookie settings' }).click()
    await screen.getByRole('button', { name: 'Reject marketing cookies' }).click()
    await changeConsentInOtherWindow('accept', `lb_meta_consent:testers%2Fsingle:${settings.pixelId}`, 'accepted')
    await vi.waitFor(() => expect(window.fbq.mock.calls.filter(([command]) => command === 'trackSingle')).toHaveLength(2))
    await screen.getByRole('link', { name: /Spotify/ }).click()
    expect(window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')).toHaveLength(2)
  })

  it.each([['spotify'], ['other']])('tracks selected song destinations without changing statistics targets: %s', async (platform) => {
    state.page = {
      ...releasePage,
      metaTracking: { ...settings, platforms: [platform] },
      sections: [{ id: 's', widgets: [{ id: 'w', type: 'song', title: 'Primary song', links: [
        { url: '#spotify', label: 'Listen', platform: { id: 'spotify', label: 'Spotify' } },
        { url: '#apple', label: 'Apple Music', platform: { id: 'apple', label: 'Apple Music' } },
        { url: '#other', label: 'Other service', platform: { id: 'other', label: 'Other' } },
      ] }] }],
    }
    const screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView'))
    await screen.getByRole('link', { name: 'Primary song' }).click()
    await screen.getByRole('link', { name: 'Apple Music' }).click()
    await screen.getByRole('link', { name: 'Other service' }).click()
    const conversions = window.fbq.mock.calls.filter(([command]) => command === 'trackSingleCustom')
    expect(conversions).toEqual([['trackSingleCustom', settings.pixelId, 'SmartLinkClick', {
      release_id: settings.releaseId, platform,
    }, { eventID: expect.any(String) }]])
    expect(state.clicks).toEqual(['song:Listen', 'platform:apple', 'song:Other service'])
  })

  it('remembers rejection and lets the visitor change it', async () => {
    let screen = await show()
    await screen.getByRole('button', { name: 'Reject marketing cookies' }).click()
    await cleanup()
    screen = await show()
    expect(screen.getByRole('dialog').elements()).toHaveLength(0)
    expect(window.fbq).not.toHaveBeenCalled()
    await screen.getByRole('button', { name: 'Cookie settings' }).click()
    await expect.element(screen.getByRole('dialog')).toBeVisible()
  })

  it('does not reuse consent for another smart link or Pixel', async () => {
    let screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await cleanup()
    screen = await show(ReleasePage, 'another/release')
    await expect.element(screen.getByRole('dialog')).toBeVisible()
    await cleanup()
    state.page = { ...releasePage, metaTracking: { ...settings, pixelId: '987654321012345' } }
    screen = await show()
    await expect.element(screen.getByRole('dialog')).toBeVisible()
  })

  it('keeps unconfigured smart links and main pages free of consent UI and storage reads', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem')
    state.page = { ...releasePage, metaTracking: undefined }
    let screen = await show()
    await expect.element(screen.getByText('Anonymous, cookieless visit statistics only.')).toBeVisible()
    expect(screen.getByRole('dialog').elements()).toHaveLength(0)
    expect(read.mock.calls.filter(([key]) => key.startsWith('lb_meta_consent'))).toHaveLength(0)
    await cleanup()
    screen = await show(BandPage, 'testers')
    expect(screen.getByRole('button', { name: 'Cookie settings' }).elements()).toHaveLength(0)
    expect(window.fbq).not.toHaveBeenCalled()
    read.mockRestore()
  })

  it('never loads tracking in an editor preview', async () => {
    await render(<ThemeProvider theme={theme}><PreviewContent page={releasePage} /></ThemeProvider>)
    expect(window.fbq).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows Meta privacy wording only for a configured smart-link context', async () => {
    history.replaceState(null, '', '/privacy?smartlink=testers%2Fsingle')
    let screen = await show(Privacy)
    await expect.element(screen.getByRole('heading', { name: 'Optional Meta advertising' })).toBeVisible()
    expect(window.fbq).not.toHaveBeenCalled()
    await cleanup()
    history.replaceState(null, '', '/privacy')
    screen = await show(Privacy)
    expect(screen.getByRole('heading', { name: 'Optional Meta advertising' }).elements()).toHaveLength(0)
    await expect.element(screen.getByText(/no cookies/, { exact: false }).first()).toBeVisible()
  })

  it('restores acceptance only for this page and requests it again after expiry', async () => {
    let screen = await show()
    await screen.getByRole('button', { name: 'Accept marketing cookies' }).click()
    await cleanup()
    window.fbq.mockClear()
    screen = await show()
    await vi.waitFor(() => expect(window.fbq).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView'))
    expect(screen.getByRole('dialog').elements()).toHaveLength(0)
    await cleanup()
    const key = `lb_meta_consent:testers%2Fsingle:${settings.pixelId}`
    const record = JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify({ ...record, at: Date.now() - 181 * 86400000 }))
    screen = await show()
    await expect.element(screen.getByRole('dialog')).toBeVisible()
  })

  it('keeps rejection effective when device storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const screen = await show()
    await screen.getByRole('button', { name: 'Reject marketing cookies' }).click()
    await screen.getByRole('link', { name: /Spotify/ }).click()
    expect(state.clicks).toEqual(['platform:spotify'])
    expect(window.fbq).not.toHaveBeenCalled()
    await screen.getByRole('button', { name: 'Cookie settings' }).click()
    await expect.element(screen.getByRole('dialog')).toBeVisible()
  })

  it('does not show advertising wording for an unconfigured or main page context', async () => {
    history.replaceState(null, '', '/privacy?smartlink=testers%2Fsingle')
    state.page = { ...releasePage, metaTracking: undefined }
    let screen = await show(Privacy)
    await expect.element(screen.getByText(/no cookies/, { exact: false }).first()).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Optional Meta advertising' }).elements()).toHaveLength(0)
    await cleanup()
    state.page = { ...releasePage, release: null }
    screen = await show(Privacy)
    await expect.element(screen.getByText(/no cookies/, { exact: false }).first()).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Optional Meta advertising' }).elements()).toHaveLength(0)
  })

  it('does not claim a smart link is cookieless when its privacy configuration cannot load', async () => {
    history.replaceState(null, '', '/privacy?smartlink=testers%2Fsingle')
    window.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 }))
    const screen = await show(Privacy)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Unable to load this smart link’s privacy settings.')
    expect(screen.getByText(/no cookies/, { exact: false }).elements()).toHaveLength(0)
    expect(window.fbq).not.toHaveBeenCalled()
  })
})
