// A release's smart link: artwork one side, content the other. The container
// query splits the panes only when the page itself is wide, so the narrow
// editor preview and phones keep one stacked column.
import Box from '@mui/material/Box'
import Section from '../../../components/Section.jsx'
import SocialLinks from '../../../components/SocialLinks.jsx'
import ReleaseArt from './ReleaseArt.jsx'
import ReleaseInfo from './ReleaseInfo.jsx'

export default function SmartLinkPage({ page, onLinkClick, footer = null }) {
  return (
    <Box sx={{ containerType: 'inline-size', '--cover-w': 'min(320px, 78vw)' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', '@container (min-width:840px)': { flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh', m: '-40px -16px -24px' } }}>
        <ReleaseArt release={page.release} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: 'var(--cover-w)', mx: 'auto', '@container (min-width:840px)': { flex: '0 0 33%', maxWidth: 'none', mx: 0, p: '56px 44px', overflowY: 'auto' } }}>
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
