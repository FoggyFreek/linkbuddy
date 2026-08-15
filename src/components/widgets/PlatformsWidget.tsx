import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { PLATFORM_ICON_COMPONENTS } from '../icons.js'
import SectionTitle from '../SectionTitle.js'
import PlayPill from '../PlayPill.js'
import type { LinkClickHandler, ResolvedPlatformsWidget } from '../../types.js'

const OtherPlatformIcon = PLATFORM_ICON_COMPONENTS.other

// "Choose your platform": one full-width row per streaming link, iconed by
// detected platform, the whole row linking out to the platform's app/site.
export default function PlatformsWidget({ widget, onLinkClick }: { widget: ResolvedPlatformsWidget; onLinkClick: LinkClickHandler }) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: '6px', p: '8px 18px' }}>
      {widget.title && <SectionTitle>{widget.title}</SectionTitle>}
      {widget.platforms.map((platform) => {
        const Icon = PLATFORM_ICON_COMPONENTS[platform.id] || OtherPlatformIcon
        return (
          <Link
            key={platform.url}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            onClick={() => onLinkClick(`platform:${platform.id}`)}
            sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 68, py: '6px', color: 'text.primary', '&:hover .play-pill': { bgcolor: 'text.primary', color: 'background.paper' } }}
          >
            <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}><Icon size={30} /></Box>
            <Typography variant="body1" component="span" sx={{ minWidth: 0 }}>{platform.label}</Typography>
            <PlayPill />
          </Link>
        )
      })}
    </Card>
  )
}
