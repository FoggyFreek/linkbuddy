import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { smartLinkPrivacyUrl } from '../lib/metaConsent.js'

// The public page's statistics disclosure (see PRIVACY.md). Both page kinds show
// it; each places it in its own footer.
export default function PrivacyNote({ smartLinkSlug }: Readonly<{ smartLinkSlug?: string }>) {
  return (
    <Box sx={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Typography variant="caption">{smartLinkSlug ? 'Optional advertising cookies, with your consent.' : 'Anonymous, cookieless visit statistics only.'}</Typography>
      <Link href={smartLinkSlug ? smartLinkPrivacyUrl(smartLinkSlug) : '/privacy'} variant="caption" sx={{ color: 'text.secondary', textDecoration: 'underline' }}>Privacy</Link>
    </Box>
  )
}
