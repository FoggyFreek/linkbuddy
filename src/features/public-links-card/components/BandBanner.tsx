import Box from '@mui/material/Box'
import { CARD_PAD_TOP, CARD_PAD_X } from '../constants.js'

// The band's banner, bled to the card's full width and top edge by negative
// margins cancelling the card's own padding; the card's `overflow: hidden`
// clips its square corners. Shown at full height rather than cropped, with no
// bottom margin — the avatar then pulls up over its bottom edge.
export default function BandBanner({ src }: { src: string }) {
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{
        display: 'block',
        width: { xs: `calc(100% + ${CARD_PAD_X.xs * 2}px)`, sm: `calc(100% + ${CARD_PAD_X.sm * 2}px)` },
        height: 'auto',
        mt: { xs: `-${CARD_PAD_TOP.xs}px`, sm: `-${CARD_PAD_TOP.sm}px` },
        mx: { xs: `-${CARD_PAD_X.xs}px`, sm: `-${CARD_PAD_X.sm}px` },
      }}
    />
  )
}
