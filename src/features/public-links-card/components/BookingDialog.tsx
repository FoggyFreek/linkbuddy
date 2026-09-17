import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import { useScopedPortalProps } from '../../../components/ColorSchemeScope.js'
import { formatMoney } from '../../../utils/format.js'
import type { Booking, BookingRepertoire, LinkClickHandler } from '../../../types.js'

const REPERTOIRE_LABELS: Record<BookingRepertoire, string> = {
  covers: 'Covers',
  tribute: 'Tribute',
  original: 'Original songs',
}

// Either end of the range may be missing: a floor alone ("from") or a ceiling
// alone ("up to") still says something useful.
function formatFee({ feeLowCents, feeHighCents, currency }: Booking): string | null {
  const low = feeLowCents == null ? null : formatMoney(feeLowCents, currency)
  const high = feeHighCents == null ? null : formatMoney(feeHighCents, currency)
  if (low && high) return `${low} – ${high}`
  if (low) return `From ${low}`
  if (high) return `Up to ${high}`
  return null
}

// A phone number is stored the way the band typed it; `tel:` wants only the
// dialable characters.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

function BookingContact({ kind, href, label, value, icon: Icon, onLinkClick }: Readonly<{
  kind: 'email' | 'phone'
  href: string
  label: string
  value: string
  icon: typeof EmailIcon
  onLinkClick: LinkClickHandler
}>) {
  return (
    <ListItemButton
      component="a"
      href={href}
      onClick={() => onLinkClick(`book:${kind}`)}
      sx={{ borderRadius: 2, bgcolor: 'surface.s2' }}
    >
      <ListItemIcon sx={{ minWidth: 40, color: 'text.primary' }}><Icon fontSize="small" /></ListItemIcon>
      <ListItemText primary={value} secondary={label} slotProps={{ secondary: { variant: 'caption' } }} />
    </ListItemButton>
  )
}

// The fee indication when there is one, and the contacts to act on.
export default function BookingDialog({ booking, bandName, open, onClose, onLinkClick }: Readonly<{
  booking: Booking
  bandName?: string | null
  open: boolean
  onClose: () => void
  onLinkClick: LinkClickHandler
}>) {
  // The dialog is portaled, so it needs the page's colour scheme handed to it.
  const scopedPortalProps = useScopedPortalProps()
  const fee = formatFee(booking)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" {...scopedPortalProps}>
      <DialogTitle>{bandName ? `Book ${bandName}` : 'Book now'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {fee ? (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Fee indication</Typography>
              <Typography variant="h6">{fee}</Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Contact for more information.</Typography>
          )}
          {booking.repertoire && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Mainly plays:</Typography>
              <Chip size="small" label={REPERTOIRE_LABELS[booking.repertoire]} />
            </Stack>
          )}
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {booking.email && (
              <BookingContact kind="email" href={`mailto:${booking.email}`} label="Email" value={booking.email} icon={EmailIcon} onLinkClick={onLinkClick} />
            )}
            {booking.phone && (
              <BookingContact kind="phone" href={telHref(booking.phone)} label="Phone" value={booking.phone} icon={PhoneIcon} onLinkClick={onLinkClick} />
            )}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
