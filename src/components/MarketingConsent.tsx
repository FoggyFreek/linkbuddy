import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useScopedPortalProps } from './ColorSchemeScope.js'
import { smartLinkPrivacyUrl, type ConsentChoice } from '../lib/metaConsent.js'

const choiceSx = { borderRadius: 0, py: 1.5, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }

export default function MarketingConsent({ open, slug, bandName, onChoose, onClose }: Readonly<{
  open: boolean; slug: string; bandName?: string; onChoose: (choice: ConsentChoice) => void; onClose: () => void
}>) {
  const portal = useScopedPortalProps()
  return (
    <Dialog open={open} onClose={onClose} {...portal} maxWidth={false} fullWidth
      aria-labelledby="marketing-consent-title" aria-describedby="marketing-consent-description"
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-end' }, '& .MuiDialog-paper': { m: 0, width: '100%', maxWidth: '100%', borderRadius: 0 } }}>
      <DialogTitle id="marketing-consent-title" variant="h3" component="h2">Your privacy matters to us</DialogTitle>
      <DialogContent>
        <Typography id="marketing-consent-description" variant="body2" sx={{ lineHeight: 1.7 }}>
          {bandName || 'This artist'} uses optional cookies to measure visits and statistics. You can listen without
          accepting and change your choice anytime using Cookie settings below.
        </Typography>
        <Box sx={{ mt: 2 }}><Link href={smartLinkPrivacyUrl(slug)} target="_blank" rel="noopener noreferrer" variant="body2">Read the privacy notice</Link></Box>
      </DialogContent>
      <DialogActions sx={{ p: 0, display: 'grid', gridTemplateColumns: '1fr', gap: 0, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Button variant="outlined" fullWidth onClick={() => onChoose('rejected')} sx={{ ...choiceSx, color: 'text.primary' }}>
          Reject marketing cookies
        </Button>
        <Button variant="contained" fullWidth onClick={() => onChoose('accepted')}
          sx={{ ...choiceSx, border: '1px solid transparent', bgcolor: 'grey.100', color: 'grey.900', '&:hover': { ...choiceSx['&:hover'], bgcolor: 'grey.300' } }}>
          Accept marketing cookies
        </Button>
      </DialogActions>
    </Dialog>
  )
}
