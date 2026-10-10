import type { PublicMetaTracking } from '../types.js'

interface PixelFunction {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[][]
  push?: PixelFunction
  loaded?: boolean
  version?: string
}

declare global {
  interface Window { fbq?: PixelFunction; _fbq?: PixelFunction }
}

const SCRIPT_SELECTOR = 'script[data-linkbuddy-meta-pixel]'
const loads = new WeakMap<HTMLScriptElement, Promise<PixelFunction>>()

function loadPixel(): Promise<PixelFunction> {
  if (window.fbq && (window.fbq.callMethod || !window.fbq.queue)) return Promise.resolve(window.fbq)
  const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
  const pending = existing && loads.get(existing)
  if (pending) return pending

  const pixel: PixelFunction = (...args) => {
    if (pixel.callMethod) pixel.callMethod(...args)
    else pixel.queue?.push(args)
  }
  pixel.queue = []
  pixel.push = pixel
  pixel.loaded = true
  pixel.version = '2.0'
  window.fbq = pixel
  window._fbq = pixel
  pixel('consent', 'revoke')

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  script.dataset.linkbuddyMetaPixel = ''
  const ready = new Promise<PixelFunction>((resolve, reject) => {
    script.onload = () => resolve(pixel)
    script.onerror = () => {
      script.remove()
      if (window.fbq === pixel) { delete window.fbq; delete window._fbq }
      reject(new Error('Meta Pixel could not load'))
    }
  })
  loads.set(script, ready)
  document.head.append(script)
  return ready
}

function clearMetaCookies() {
  const parts = window.location.hostname.split('.')
  const domains = ['', ...parts.map((_part, i) => parts.slice(i).join('.'))]
  const segments = window.location.pathname.split('/').filter(Boolean)
  const paths = ['/', ...segments.map((_part, i) => `/${segments.slice(0, i + 1).join('/')}`)]
  for (const name of ['_fbp', '_fbc']) {
    for (const path of paths) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`
      }
    }
  }
}

export function startMetaPixel(settings: PublicMetaTracking) {
  let active = true
  let pixel: PixelFunction | null = null
  const pending: { platform: string; eventID: string }[] = []
  const send = ({ platform, eventID }: { platform: string; eventID: string }) => {
    pixel?.('trackSingleCustom', settings.pixelId, 'SmartLinkClick', {
      release_id: settings.releaseId, platform,
    }, { eventID })
  }

  void loadPixel().then((loaded) => {
    if (!active) return
    pixel = loaded
    pixel('set', 'autoConfig', false, settings.pixelId)
    pixel('init', settings.pixelId)
    pixel('consent', 'grant')
    pixel('trackSingle', settings.pixelId, 'PageView')
    for (const event of pending) send(event)
    pending.length = 0
  }).catch(() => { pending.length = 0 })

  return {
    trackClick(target: string) {
      if (!active || !target.startsWith('platform:')) return
      const platform = target.slice('platform:'.length)
      if (!settings.platforms.includes(platform)) return
      const event = { platform, eventID: crypto.randomUUID() }
      if (pixel) send(event)
      else if (pending.length < 20) pending.push(event)
    },
    stop() {
      active = false
      pending.length = 0
      window.fbq?.('consent', 'revoke')
    },
  }
}

export function revokeMetaConsent() {
  window.fbq?.('consent', 'revoke')
  clearMetaCookies()
}
