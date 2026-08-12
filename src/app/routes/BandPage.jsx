import { Fragment, useEffect } from 'react'
import Box from '@mui/material/Box'
import usePublicPage from './usePublicPage.js'
import useFavicon from './useFavicon.js'
import LinksCard from '../../features/public-links-card/components/LinksCard.jsx'
import PageScope from '../../components/PageScope.jsx'
import PageStatus from '../../components/PageStatus.jsx'
import PrivacyNote from '../../components/PrivacyNote.jsx'
import PoweredByGigBuddy from '../../components/PoweredByGigBuddy.jsx'
import ShareButton from '../../components/ShareButton.jsx'

// A band's link page (/<slug>): one centered card running flush off the bottom
// of the page. The card is the positioned ancestor its chrome pins to —
// attribution top-left, share top-right — and it holds the footer too.
export default function BandPage({ slug }) {
  const { page, status, onLinkClick } = usePublicPage(slug)
  const band = page?.band

  useEffect(() => {
    if (page) document.title = page.band?.name ? `${page.band.name} — Links` : 'Band Links'
  }, [page])
  useFavicon(band?.avatarUrl)

  if (status !== 'ready') return <PageStatus status={status} />

  const corners = (
    <Fragment>
      <PoweredByGigBuddy href={page.gigbuddyUrl} variant="corner" />
      <ShareButton
        url={`${window.location.origin}/${slug}`}
        title={band?.name || 'Band links'}
        variant="corner"
        onShare={(channel) => onLinkClick(`share:${channel}`)}
      />
    </Fragment>
  )

  const footer = (
    <Box component="footer" sx={{ maxWidth: 600, mx: 'auto', mt: '32px', display: 'flex', justifyContent: 'center', color: 'text.secondary' }}>
      <PrivacyNote />
    </Box>
  )

  return (
    <PageScope page={page} sx={{ minHeight: '100dvh', px: 2, pt: 5, display: 'flex', flexDirection: 'column' }}>
      <LinksCard page={page} onLinkClick={onLinkClick} footer={footer} corner={corners} flush />
    </PageScope>
  )
}
