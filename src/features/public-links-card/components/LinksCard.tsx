// The band's link page: one centered card holding the band header and the
// sections of widget cards. Its `surface.s2` shell keeps the `background.paper`
// widget cards inside it reading as a distinct surface in both schemes. Living
// here rather than in the route means the editor preview shows the same card.
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import Section from '../../../components/Section.js'
import BandHeader from './BandHeader.js'
import BandBanner from './BandBanner.js'
import { CARD_PAD_TOP, CARD_PAD_X } from '../constants.js'
import type { ReactNode } from 'react'
import type { LinkClickHandler, ResolvedPage } from '../../../types.js'

// `corner` is a node pinned to the card (the band page's attribution and share
// buttons), which is its positioned ancestor. `flush` runs the card's bottom
// edge off the page — the band page sets it, the framed editor preview doesn't.
export default function LinksCard({ page, onLinkClick, footer = null, corner = null, flush = false }: {
  page: ResolvedPage
  onLinkClick: LinkClickHandler
  footer?: ReactNode
  corner?: ReactNode
  flush?: boolean
}) {
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
