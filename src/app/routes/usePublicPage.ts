import { useCallback, useEffect, useState } from 'react'
import { getPublicPage, sendView, sendClick } from '../../lib/api.js'
import type { ResolvedPage } from '../../types.js'
import type { PageLoadStatus } from '../../components/PageStatus.js'
import { ApiError } from '../../types.js'

// The network half of a public page, shared by both page kinds: fetch the
// resolved payload, report the one view beacon, and hand back a click reporter.
// Sets no cookies and stores nothing on the device; the beacons carry only the
// referrer/utm_source already known to the browser (see PRIVACY.md).
//
// It deliberately doesn't touch document.title — the title is written from
// kind-specific fields, so each route owns its own.

function utmSourceFromLocation() {
  return new URLSearchParams(window.location.search).get('utm_source')
}

export default function usePublicPage(slug: string) {
  const [page, setPage] = useState<ResolvedPage | null>(null)
  const [status, setStatus] = useState<PageLoadStatus>('loading')

  useEffect(() => {
    let cancelled = false
    getPublicPage(slug)
      .then((data) => {
        if (cancelled) return
        setPage(data)
        setStatus('ready')
        sendView(slug, { referrer: document.referrer, utmSource: utmSourceFromLocation() })
      })
      .catch((err) => {
        if (!cancelled) setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const onLinkClick = useCallback(
    (target: string) => {
      sendClick(slug, target, { referrer: document.referrer, utmSource: utmSourceFromLocation() })
    },
    [slug],
  )

  return { page, status, onLinkClick }
}
