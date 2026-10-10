import { afterEach, describe, expect, it, vi } from 'vitest'
import { startMetaPixel, revokeMetaConsent } from '../metaPixel.js'

const settings = { pixelId: '123456789012345', releaseId: 'song:1', platforms: ['spotify'] }
let script
let tracker

function interceptScript() {
  delete window.fbq
  vi.spyOn(document.head, 'append').mockImplementation((element) => { script = element })
}

async function loadScript() {
  window.fbq.callMethod = vi.fn()
  script.dispatchEvent(new Event('load'))
  await vi.waitFor(() => expect(window.fbq.callMethod).toHaveBeenCalled())
}

afterEach(() => {
  tracker?.stop()
  tracker = null
  delete window.fbq
  delete window._fbq
  vi.restoreAllMocks()
})

describe('Meta script delivery', () => {
  it('loads the official script only when started and retains qualifying clicks during loading', async () => {
    interceptScript()
    tracker = startMetaPixel(settings)
    expect(script.src).toBe('https://connect.facebook.net/en_US/fbevents.js')
    expect(script.async).toBe(true)
    tracker.trackClick('platform:spotify')
    tracker.trackClick('share:facebook')
    tracker.trackClick('embed:spotify')
    tracker.trackClick('platform:apple')
    await loadScript()
    const calls = window.fbq.callMethod.mock.calls
    expect(calls).toContainEqual(['set', 'autoConfig', false, settings.pixelId])
    expect(calls).toContainEqual(['init', settings.pixelId])
    expect(calls).toContainEqual(['consent', 'grant'])
    expect(calls).toContainEqual(['trackSingle', settings.pixelId, 'PageView'])
    expect(calls.filter(([command]) => command === 'trackSingleCustom')).toHaveLength(1)
  })

  it('never initialises or sends queued events if consent is withdrawn during script loading', async () => {
    interceptScript()
    tracker = startMetaPixel(settings)
    tracker.trackClick('platform:spotify')
    tracker.stop()
    window.fbq.callMethod = vi.fn()
    script.dispatchEvent(new Event('load'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(window.fbq.callMethod).not.toHaveBeenCalled()
  })

  it('fails quietly when Meta is blocked and permits a later retry', async () => {
    interceptScript()
    tracker = startMetaPixel(settings)
    script.dispatchEvent(new Event('error'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(window.fbq).toBeUndefined()
    tracker.stop()
    tracker = startMetaPixel(settings)
    await loadScript()
    expect(window.fbq.callMethod).toHaveBeenCalledWith('trackSingle', settings.pixelId, 'PageView')
  })

  it('removes first-party Meta cookies when the visitor withdraws', () => {
    window.fbq = vi.fn()
    document.cookie = '_fbp=test; Path=/'
    document.cookie = '_fbc=test; Path=/'
    revokeMetaConsent()
    expect(window.fbq).toHaveBeenCalledWith('consent', 'revoke')
    expect(document.cookie).not.toContain('_fbp=')
    expect(document.cookie).not.toContain('_fbc=')
  })
})
