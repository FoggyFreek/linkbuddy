// A release's smart link: artwork beside content past the 840px container query,
// one stacked column below it — full width under `sm` (viewport, not container).
import Box from '@mui/material/Box'
import Section from '../../../components/Section.js'
import SocialLinks from '../../../components/SocialLinks.js'
import ReleaseArt from './ReleaseArt.js'
import ReleaseInfo from './ReleaseInfo.js'
import type { ReactNode } from 'react'
import type { LinkClickHandler, Release, ResolvedPage } from '../../../types.js'

export default function SmartLinkPage({ page, onLinkClick, footer = null }: Readonly<{
  page: ResolvedPage & { release: Release }
  onLinkClick: LinkClickHandler
  footer?: ReactNode
}>) {
  return (
    <Box sx={{ containerType: 'inline-size', '--cover-w': { xs: '100%', sm: 'min(320px, 78vw)' } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', '@container (min-width:840px)': { flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh', m: '-40px -16px -24px' } }}>
        <ReleaseArt release={page.release} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: 'var(--cover-w)', mx: 'auto', px: { xs: 2, sm: 0 }, pb: { xs: 3, sm: 0 }, '@container (min-width:840px)': { flex: '0 0 33%', maxWidth: 'none', mx: 0, p: '56px 44px', overflowY: 'auto' } }}>
          <ReleaseInfo release={page.release} />
          {page.sections.map((section) => <Section key={section.id} section={section} onLinkClick={onLinkClick} />)}
          {/* The band header normally hosts the socials; the release header
              replaces it, so they land at the foot of the content pane. */}
          <SocialLinks band={page.band} onLinkClick={onLinkClick} variant="circle" />
          {/* Inside the pane, so the desktop split stays artwork + content. */}
          {footer}
        </Box>
      </Box>
    </Box>
  )
}
