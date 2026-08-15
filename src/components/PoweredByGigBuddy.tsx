import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { useScopedPortalProps } from './ColorSchemeScope.js'
import logoUrl from '../../shared/icons/gb_whiteback_128.png'
import type { SxProps, Theme } from '@mui/material/styles'

// The GigBuddy attribution badge — the top-left mirror of ShareButton on the
// band page (`corner`: pinned to the nearest positioned ancestor, its content
// card). `inline` is the unpinned form the release page uses, sitting centred in
// the footer whichever way that footer aligns its other rows, and a size up
// because it stands alone there. Keep the pinned styles in step with ShareButton's.
// `href` comes from the page payload (server GIGBUDDY_WEB_URL); without it there is
// nothing to link to, so the badge stays away rather than guessing an origin.
export default function PoweredByGigBuddy({ href, variant = 'corner' }: { href?: string; variant?: 'corner' | 'inline' }) {
  const scopedPortalProps = useScopedPortalProps()
  if (!href) return null

  const pinnedSx = {
    top: 12,
    left: 12,
    zIndex: 10,
    bgcolor: 'background.paper',
    boxShadow: '0 1px 3px rgb(20 22 26 / 0.2)',
    '&:hover': { bgcolor: 'action.hover' },
  }
  const variantSx: SxProps<Theme> = {
    corner: { position: 'absolute', ...pinnedSx },
    inline: { alignSelf: 'center' },
  }[variant] as SxProps<Theme>
  const logoSize = variant === 'inline' ? 40 : 28

  return (
    <Tooltip title="powered by gigBuddy" slotProps={{ popper: scopedPortalProps }}>
      <IconButton
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="powered by gigBuddy"
        sx={{ p: '4px', ...variantSx }}
      >
        {/* The logo ships with a white plate; the circle keeps it reading as a
            badge on the dark paper surface too. */}
        <Box component="img" src={logoUrl} alt="" sx={{ width: logoSize, height: logoSize, borderRadius: '50%', display: 'block' }} />
      </IconButton>
    </Tooltip>
  )
}
