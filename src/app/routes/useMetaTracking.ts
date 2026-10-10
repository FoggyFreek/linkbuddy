import { useCallback, useEffect, useRef, useState } from 'react'
import { consentKey, readConsent, saveConsent, type ConsentChoice } from '../../lib/metaConsent.js'
import { revokeMetaConsent, startMetaPixel } from '../../lib/metaPixel.js'
import type { PublicMetaTracking } from '../../types.js'

export default function useMetaTracking(slug: string, settings?: PublicMetaTracking) {
  const key = settings ? consentKey(slug, settings.pixelId) : null
  const [decision, setDecision] = useState<{ key: string; choice: ConsentChoice | null } | null>(null)
  const [reopened, setReopened] = useState(false)
  const tracker = useRef<ReturnType<typeof startMetaPixel> | null>(null)
  const choice = decision?.key === key ? decision?.choice : null

  const stopTracking = useCallback(() => {
    const current = tracker.current
    if (!current) return
    current.stop()
    tracker.current = null
    revokeMetaConsent()
  }, [])

  useEffect(() => {
    if (!key) return
    const syncConsent = () => {
      const nextChoice = readConsent(key)
      if (nextChoice !== 'accepted') stopTracking()
      setDecision({ key, choice: nextChoice })
      setReopened(false)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== null && event.key !== key)) return
      syncConsent()
    }
    syncConsent()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, stopTracking])

  useEffect(() => {
    if (!settings || choice !== 'accepted') return
    const current = startMetaPixel(settings)
    tracker.current = current
    return () => {
      current.stop()
      if (tracker.current === current) tracker.current = null
    }
  }, [settings, choice, key])

  const choose = useCallback((next: ConsentChoice) => {
    if (!key) return
    if (next === 'rejected') stopTracking()
    saveConsent(key, next)
    setDecision({ key, choice: next })
    setReopened(false)
  }, [key, stopTracking])

  const trackClick = useCallback((target: string) => tracker.current?.trackClick(target), [])
  return {
    open: Boolean(key && decision?.key === key && (!choice || reopened)),
    choose, reopen: () => setReopened(true),
    dismiss: () => { if (choice) setReopened(false) },
    trackClick,
  }
}
