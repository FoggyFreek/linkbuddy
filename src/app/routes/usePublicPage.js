import { useCallback, useEffect, useState } from 'react'
import { getPublicPage, sendView, sendClick } from '../../lib/api.js'

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

export default function usePublicPage(slug) {
  const [page, setPage] = useState(null)
  const [status, setStatus] = useState('loading')

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
        if (!cancelled) setStatus(err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const onLinkClick = useCallback(
    (target) => {
      sendClick(slug, target, { referrer: document.referrer, utmSource: utmSourceFromLocation() })
    },
    [slug],
  )

  return { page, status, onLinkClick }
}
