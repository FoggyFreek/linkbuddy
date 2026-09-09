import { useEffect } from 'react'
import Box from '@mui/material/Box'
import usePublicPage from './usePublicPage.js'
import useFavicon from './useFavicon.js'
import SmartLinkPage from '../../features/smart-link/components/SmartLinkPage.js'
import PageScope from '../../components/PageScope.js'
import PageStatus from '../../components/PageStatus.js'
import PrivacyNote from '../../components/PrivacyNote.js'
import PoweredByGigBuddy from '../../components/PoweredByGigBuddy.js'
import ShareButton from '../../components/ShareButton.js'

// A release's smart link (/<mainSlug>/<tail>): artwork-led and full-bleed, its
// chrome floating over the viewport and its attribution riding in the footer.
export default function ReleasePage({ slug }: Readonly<{ slug: string }>) {
  const { page, status, onLinkClick } = usePublicPage(slug)
  const release = page?.release

  useEffect(() => {
    if (release) document.title = `${release.title} — ${release.artist || 'Listen'}`
  }, [release])
  useFavicon(release?.coverUrl)

  if (status !== 'ready' || !page) return <PageStatus status={status} />
  // Release path without a release header: not-found beats a headless smart link.
  if (!release) return <PageStatus status="notfound" />
  const releasePage = { ...page, release }

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
    // SmartLinkPage's `m: '-40px -16px -24px'` cancels this padding once the panes
    // split — keep the two in step. Phones drop it: the content is the page there.
    <PageScope page={releasePage} bleed sx={{ minHeight: '100dvh', px: { xs: 0, sm: 2 }, pt: { xs: 0, sm: 5 }, pb: { xs: 0, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
      <ShareButton
        url={`${window.location.origin}/${slug}`}
        title={shareTitle}
        variant="floating"
        onShare={(channel) => onLinkClick(`share:${channel}`)}
      />
      <SmartLinkPage page={releasePage} onLinkClick={onLinkClick} footer={footer} />
    </PageScope>
  )
}
