// The band page's card: header plus widget sections on a `surface.s2` shell, so
// the `background.paper` widgets read distinctly. Shared with the editor preview.
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import Section from '../../../components/Section.js'
import BandHeader from './BandHeader.js'
import BandBanner from './BandBanner.js'
import { CARD_PAD_TOP, CARD_PAD_X } from '../constants.js'
import type { ReactNode } from 'react'
import type { LinkClickHandler, ResolvedPage } from '../../../types.js'

// `corner` pins to the card (its positioned ancestor); `flush` runs the bottom
// edge off the page, and all four below `sm`. The preview sets neither.
export default function LinksCard({ page, onLinkClick, footer = null, corner = null, flush = false }: Readonly<{
  page: ResolvedPage
  onLinkClick: LinkClickHandler
  footer?: ReactNode
  corner?: ReactNode
  flush?: boolean
}>) {
  const bannerShown = !!(page.showBanner && page.band?.bannerUrl)
  return (
    <Card
      sx={(theme) => ({
        position: 'relative',
        width: '100%', maxWidth: 612, mx: 'auto',
        bgcolor: 'surface.s2',
        borderRadius: `${theme.shape.preview}px`,
        p: { xs: `${CARD_PAD_TOP.xs}px ${CARD_PAD_X.xs}px 26px`, sm: `${CARD_PAD_TOP.sm}px ${CARD_PAD_X.sm}px 34px` },
        // Clips the banner's square corners to the card's rounded shape.
        ...(bannerShown && { overflow: 'hidden' }),
        ...(flush && {
          flexGrow: 1,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          [theme.breakpoints.down('sm')]: { maxWidth: 'none', borderRadius: 0 },
        }),
      })}
    >
      {corner}
      {bannerShown && page.band?.bannerUrl && <BandBanner src={page.band.bannerUrl} />}
      <Stack spacing={1.75} sx={{ maxWidth: 600, mx: 'auto' }}>
        <BandHeader band={page.band} onLinkClick={onLinkClick} bannerShown={bannerShown} />
        {page.sections.map((section) => <Section key={section.id} section={section} onLinkClick={onLinkClick} />)}
      </Stack>
      {footer}
    </Card>
  )
}
