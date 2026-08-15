import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'

// The public page's statistics disclosure (see PRIVACY.md). Both page kinds show
// it; each places it in its own footer.
export default function PrivacyNote() {
  return (
    <Box sx={{ display: 'flex', gap: '12px' }}>
      <Typography variant="caption">Anonymous, cookieless visit statistics only.</Typography>
      <Link href="/privacy" variant="caption" sx={{ color: 'text.secondary', textDecoration: 'underline' }}>Privacy</Link>
    </Box>
  )
}
