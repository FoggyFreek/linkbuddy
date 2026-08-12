import { useEffect } from 'react'
import Box from '@mui/material/Box'
import usePublicPage from './usePublicPage.js'
import useFavicon from './useFavicon.js'
import SmartLinkPage from '../../features/smart-link/components/SmartLinkPage.jsx'
import PageScope from '../../components/PageScope.jsx'
import PageStatus from '../../components/PageStatus.jsx'
import PrivacyNote from '../../components/PrivacyNote.jsx'
import PoweredByGigBuddy from '../../components/PoweredByGigBuddy.jsx'
import ShareButton from '../../components/ShareButton.jsx'

// A release's smart link (/<mainSlug>/<tail>): artwork-led and full-bleed, so
// its chrome floats over the viewport rather than sitting on a card. The
// attribution has nothing to pin to and rides at the top of the footer instead.
export default function ReleasePage({ slug }) {
  const { page, status, onLinkClick } = usePublicPage(slug)
  const release = page?.release

  useEffect(() => {
    if (release) document.title = `${release.title} — ${release.artist || 'Listen'}`
  }, [release])
  useFavicon(release?.coverUrl)

  if (status !== 'ready') return <PageStatus status={status} />
  // The path says release but the payload has no release header: treat it as a
  // page that isn't there rather than rendering a headless smart link.
  if (!release) return <PageStatus status="notfound" />

  const shareTitle = `${release.title} — ${release.artist || ''}`.trim().replace(/—$/, '').trim()

  const footer = (
    <Box
      component="footer"
      sx={{
        maxWidth: 600, mx: 'auto', mt: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'text.secondary',
        '@container (min-width:840px)': { mt: 'auto', alignItems: 'flex-start' },
      }}
    >
      <PoweredByGigBuddy href={page.gigbuddyUrl} variant="inline" />
      <PrivacyNote />
    </Box>
  )

  return (
    // SmartLinkPage's `m: '-40px -16px -24px'` cancels this padding exactly once
    // the panes split, so the artwork bleeds to the viewport edges — keep the two
    // in step.
    <PageScope page={page} sx={{ minHeight: '100dvh', px: 2, pt: 5, pb: 3, display: 'flex', flexDirection: 'column' }}>
      <ShareButton
        url={`${window.location.origin}/${slug}`}
        title={shareTitle}
        variant="floating"
        onShare={(channel) => onLinkClick(`share:${channel}`)}
      />
      <SmartLinkPage page={page} onLinkClick={onLinkClick} footer={footer} />
    </PageScope>
  )
}
