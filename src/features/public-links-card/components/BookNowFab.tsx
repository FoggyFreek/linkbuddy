import { Fragment, useState } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import EmailIcon from '@mui/icons-material/Email'
import BookingDialog from './BookingDialog.js'
import type { Booking, LinkClickHandler } from '../../../types.js'

// The button announces itself: it pops in as a plain circle, unfurls into
// "Book now", and sends a couple of rings out.
const ENTER_AT = 500
const WIDEN_AT = 1150
const RING_AT = 1750

const KEYFRAMES = {
  '@keyframes lbFabEnter': {
    '0%': { opacity: 0, transform: 'translateY(16px) scale(0.3)' },
    '65%': { opacity: 1, transform: 'translateY(0) scale(1.12)' },
    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
  // The label is clipped to nothing, so the button is a circle until it widens.
  '@keyframes lbFabLabel': {
    '0%': { maxWidth: 0, marginLeft: 0, opacity: 0 },
    '40%': { opacity: 0 },
    '100%': { maxWidth: '10em', marginLeft: '8px', opacity: 1 },
  },
  // 14px of padding either side of a 20px icon is exactly the 48px height, so
  // the button starts as a true circle and widens with its label.
  '@keyframes lbFabWiden': {
    '0%': { paddingLeft: '14px', paddingRight: '14px' },
    '100%': { paddingLeft: '20px', paddingRight: '20px' },
  },
  '@keyframes lbFabRing': {
    '0%': { inset: 0, opacity: 0.5 },
    '100%': { inset: '-18px', opacity: 0 },
  },
}

// The static styles are the last keyframe, so dropping the animation lands on
// the finished state rather than a half-played one.
const STILL = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

// "Book now" for a band that published its booking details in GigBuddy. Renders
// nothing when the payload carries no booking block (the band did not opt in).
export default function BookNowFab({ booking, bandName, onLinkClick = () => {} }: Readonly<{
  booking: Booking | null | undefined
  bandName?: string | null
  onLinkClick?: LinkClickHandler
}>) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)

  if (!booking) return null

  return (
    <Fragment>
      <Box sx={{ ...KEYFRAMES, position: 'fixed', right: 16, bottom: 16, zIndex: 'fab', display: 'inline-flex', borderRadius: 999 }}>
        {/* Decorative: the rings pulse until the visitor has looked inside. */}
        {!seen && (
          <Box
            aria-hidden
            data-testid="book-now-pulse"
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              border: '2px solid',
              borderColor: 'primary.main',
              opacity: 0,
              pointerEvents: 'none',
              animation: `lbFabRing 1.5s ease-out ${RING_AT}ms 3 both`,
              ...STILL,
            }}
          />
        )}
        <Fab
          variant="extended"
          color="primary"
          onClick={() => {
            onLinkClick('book:open')
            setSeen(true)
            setOpen(true)
          }}
          sx={{
            position: 'relative',
            px: 2.5,
            animation: [
              `lbFabEnter 560ms cubic-bezier(0.2, 0.9, 0.3, 1.2) ${ENTER_AT}ms both`,
              `lbFabWiden 420ms cubic-bezier(0.2, 0.8, 0.2, 1) ${WIDEN_AT}ms both`,
            ].join(', '),
            ...STILL,
          }}
        >
          <EmailIcon />
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '10em',
              ml: 1,
              animation: `lbFabLabel 420ms cubic-bezier(0.2, 0.8, 0.2, 1) ${WIDEN_AT}ms both`,
              ...STILL,
            }}
          >
            Book now
          </Box>
        </Fab>
      </Box>
      <BookingDialog
        booking={booking}
        bandName={bandName}
        open={open}
        onClose={() => setOpen(false)}
        onLinkClick={onLinkClick}
      />
    </Fragment>
  )
}
