import { useCallback, useEffect, useState } from 'react'
import Typography from '@mui/material/Typography'
import { getPublicPage, sendView, sendClick } from './api.js'
import WidgetStack from './WidgetStack.jsx'
import ShareButton from './ShareButton.jsx'

function utmSourceFromLocation() {
  return new URLSearchParams(window.location.search).get('utm_source')
}

// The visitor-facing page. Sets no cookies and stores nothing on the device;
// the single view beacon carries only the referrer/utm_source already known
// to the browser (see PRIVACY.md).
export default function PublicPage({ slug }) {
  const [page, setPage] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    getPublicPage(slug)
      .then((data) => {
        if (cancelled) return
        setPage(data)
        setStatus('ready')
        document.title = data.release?.title
          ? `${data.release.title} — ${data.release.artist || 'Listen'}`
          : data.band?.name
            ? `${data.band.name} — Links`
            : 'Band Links'
        sendView(slug, { referrer: document.referrer, utmSource: utmSourceFromLocation() })
      })
      .catch((err) => {
        if (!cancelled) setStatus(err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Paint the whole viewport in the band's chosen theme (light default). Scoped
  // to the public route: cleaned up on unmount so the editor/privacy chrome
  // never inherits a visitor page's dark theme.
  useEffect(() => {
    const theme = page?.band?.theme === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [page])

  const onLinkClick = useCallback(
    (target) => {
      sendClick(slug, target, { referrer: document.referrer, utmSource: utmSourceFromLocation() })
    },
    [slug],
  )

  if (status === 'loading') return <div className="page-status" aria-busy="true" />
  if (status === 'notfound') {
    return (
      <Typography className="page-status" variant="body1" component="div">
        This page doesn&apos;t exist (or isn&apos;t published yet).
      </Typography>
    )
  }
  if (status === 'error') {
    return (
      <Typography className="page-status" variant="body1" component="div">
        Something went wrong — try again later.
      </Typography>
    )
  }

  const shareTitle = page.release?.title
    ? `${page.release.title} — ${page.release.artist || ''}`.trim().replace(/—$/, '').trim()
    : page.band?.name || 'Band links'

  const footer = (
    <footer className="page-footer">
      <Typography component="span" variant="caption">Anonymous, cookieless visit statistics only.</Typography>
      <a href="/privacy">Privacy</a>
    </footer>
  )

  return (
    <div className="public-page">
      <ShareButton
        url={`${window.location.origin}/${slug}`}
        title={shareTitle}
        onShare={(channel) => onLinkClick(`share:${channel}`)}
      />
      {/* WidgetStack places the footer for us — inside the content pane on the
          two-pane release layout, below the stack on the band page. */}
      <WidgetStack page={page} onLinkClick={onLinkClick} footer={footer} />
    </div>
  )
}
