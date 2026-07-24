import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { getPublicPage, sendView, sendClick } from './api.js'
import WidgetStack from './WidgetStack.jsx'
import ShareButton from './ShareButton.jsx'

function utmSourceFromLocation() {
  return new URLSearchParams(window.location.search).get('utm_source')
}

// Centred page-status message (loading / not-found / error), matching the
// muted, vertically-offset placeholder the whole app uses.
function PageStatus({ children, busy }) {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: '20vh', px: 3, textAlign: 'center', color: 'text.secondary' }} aria-busy={busy || undefined}>
      {children}
    </Box>
  )
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

  // Paint the whole viewport in the band's chosen theme (light default). Setting
  // data-theme on <html> lets MUI's colour-scheme variables — and CssBaseline's
  // body background — resolve to the band's scheme. Scoped to the public route:
  // cleaned up on unmount so the editor/privacy chrome never inherits it.
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

  if (status === 'loading') return <PageStatus busy />
  if (status === 'notfound') return <PageStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</PageStatus>
  if (status === 'error') return <PageStatus>Something went wrong — try again later.</PageStatus>

  const shareTitle = page.release?.title
    ? `${page.release.title} — ${page.release.artist || ''}`.trim().replace(/—$/, '').trim()
    : page.band?.name || 'Band links'

  const footer = (
    <Box
      component="footer"
      sx={{
        maxWidth: 600, mx: 'auto', mt: '32px', display: 'flex', justifyContent: 'center', gap: '12px', color: 'text.secondary',
        '@container (min-width:840px)': { mt: 'auto', justifyContent: 'flex-start' },
      }}
    >
      <Typography variant="caption">Anonymous, cookieless visit statistics only.</Typography>
      <Link href="/privacy" variant="caption" sx={{ color: 'text.secondary', textDecoration: 'underline' }}>Privacy</Link>
    </Box>
  )

  return (
    <Box sx={{ px: 2, pt: 5, pb: 3 }}>
      <ShareButton
        url={`${window.location.origin}/${slug}`}
        title={shareTitle}
        onShare={(channel) => onLinkClick(`share:${channel}`)}
      />
      {/* WidgetStack places the footer for us — inside the content pane on the
          two-pane release layout, below the stack on the band page. */}
      <WidgetStack page={page} onLinkClick={onLinkClick} footer={footer} />
    </Box>
  )
}
