import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { getPublicPage, sendView, sendClick } from '../../lib/api.js'
import PageContent from '../../components/PageContent.jsx'
import ShareButton from '../../components/ShareButton.jsx'
import CenteredStatus from '../../components/CenteredStatus.jsx'
import ColorSchemeScope from '../../components/ColorSchemeScope.jsx'
import { pageBackgroundSx } from '../../lib/pageBackgrounds.js'

function utmSourceFromLocation() {
  return new URLSearchParams(window.location.search).get('utm_source')
}

function documentTitle(data) {
  if (data.release?.title) return `${data.release.title} — ${data.release.artist || 'Listen'}`
  if (data.band?.name) return `${data.band.name} — Links`
  return 'Band Links'
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
        document.title = documentTitle(data)
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

  if (status === 'loading') return <CenteredStatus busy />
  if (status === 'notfound') return <CenteredStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</CenteredStatus>
  if (status === 'error') return <CenteredStatus>Something went wrong — try again later.</CenteredStatus>

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

  const share = (variant) => (
    <ShareButton
      url={`${window.location.origin}/${slug}`}
      title={shareTitle}
      variant={variant}
      onShare={(channel) => onLinkClick(`share:${channel}`)}
    />
  )

  return (
    <ColorSchemeScope
      mode={page.theme === 'dark' ? 'dark' : 'light'}
      sx={[
        {
          minHeight: '100dvh', px: 2, pt: 5,
          pb: page.release ? 3 : 0,
          display: 'flex', flexDirection: 'column',
        },
        pageBackgroundSx(page.background),
      ]}
    >
      {page.release && share('floating')}
      <PageContent
        page={page}
        onLinkClick={onLinkClick}
        footer={footer}
        corner={page.release ? null : share('corner')}
        flush
      />
    </ColorSchemeScope>
  )
}
