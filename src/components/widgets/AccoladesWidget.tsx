import { useId, useLayoutEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import type { Accolade, LinkClickHandler, ResolvedAccoladesWidget } from '../../types.js'

// Cards tile with a negative offset so the centred card sits on top of its neighbours.
const OVERLAP = 24
// Card width, and the inline padding that centres the first and last card on it.
// Peeked neighbours stay reachable by scroll, so they are not aria-hidden.
const CARD = 'min(52cqi, 196px)'
const EDGE = 'calc(50cqi - min(26cqi, 98px))'

const arrowSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 3,
  width: 40,
  height: 40,
  p: 0,
  bgcolor: 'transparent',
  color: 'text.primary',
  '&:hover': { bgcolor: 'transparent', opacity: 0.6 },
} as const

function AccoladeContent({ accolade }: Readonly<{ accolade: Accolade }>) {
  return <>
    {accolade.imageUrl && <Box component="img" src={accolade.imageUrl} alt="" loading="lazy" sx={{ display: 'block', width: 'auto', maxWidth: 'calc(100% - 32px)', height: 115, objectFit: 'contain', m: '16px auto 0' }} />}
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{accolade.description}</Typography>
      <Typography component="time" dateTime={accolade.date} variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
        {new Date(`${accolade.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
      </Typography>
    </Box>
  </>
}

export default function AccoladesWidget({ widget, onLinkClick }: Readonly<{ widget: ResolvedAccoladesWidget; onLinkClick: LinkClickHandler }>) {
  const carouselId = useId()
  const carouselRef = useRef<HTMLDivElement>(null)
  const count = widget.accolades.length
  // From three cards up, open on the second
  const initial = count > 2 ? 1 : 0
  const [active, setActive] = useState(initial)

  // Cards are equal width, so the scroll offset that centres card i is i * step.
  const step = () => {
    const card = carouselRef.current?.querySelector('article')
    return card ? card.offsetWidth - OVERLAP : (carouselRef.current?.clientWidth ?? 1)
  }
  const goTo = (index: number) => {
    const carousel = carouselRef.current
    if (!carousel) return
    const clamped = Math.min(Math.max(index, 0), count - 1)
    carousel.scrollTo({ left: clamped * step(), behavior: 'instant' })
    setActive(clamped)
  }

  useLayoutEffect(() => { goTo(initial) }, [])

  if (!count) return null
  const label = widget.title || 'Accolades'
  return (
    <Card elevation={0} sx={{ p: '16px 0 12px', minWidth: 0, bgcolor: 'transparent', boxShadow: 'none' }}>
      <Typography variant="h4" component="h3" sx={{ textAlign: 'center', mx: '16px', mb: '12px', overflowWrap: 'anywhere' }}>{label}</Typography>
      <Box sx={{ position: 'relative', minWidth: 0, containerType: 'inline-size' }}>
        {count > 1 && <IconButton aria-label="Previous accolade" aria-controls={carouselId} onClick={() => goTo(active - 1)} sx={{ ...arrowSx, left: 4 }}><ChevronLeft fontSize="large" /></IconButton>}
        {count > 1 && <IconButton aria-label="Next accolade" aria-controls={carouselId} onClick={() => goTo(active + 1)} sx={{ ...arrowSx, right: 4 }}><ChevronRight fontSize="large" /></IconButton>}
        <Box id={carouselId} ref={carouselRef} role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0}
          onScroll={(event) => setActive(Math.round(event.currentTarget.scrollLeft / step()))}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
            }
          }}
          sx={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', px: EDGE, pb: 1, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {widget.accolades.map((accolade, index) => (
            <Card key={accolade.id} component="article" elevation={0}
              sx={{ flex: `0 0 ${CARD}`, minWidth: 0, ml: index === 0 ? 0 : `-${OVERLAP}px`, scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', position: 'relative', transition: 'opacity .3s ease, transform .3s ease, box-shadow .3s ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' }, ...(index === active
                ? { zIndex: 2, opacity: 1, transform: 'none', boxShadow: 6 }
                : { zIndex: 1, opacity: 0.55, transform: 'scale(0.88)', boxShadow: 1 }) }}>
              {accolade.url ? <CardActionArea component="a" href={accolade.url} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick(`accolade:${accolade.id}`)} sx={{ flex: 1, display: 'block', borderRadius: 'inherit' }}>
                <AccoladeContent accolade={accolade} />
              </CardActionArea> : <AccoladeContent accolade={accolade} />}
            </Card>
          ))}
        </Box>
      </Box>
      {count > 1 && <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', mt: '10px', px: '16px' }}>
        {widget.accolades.map((accolade, index) => (
          <Box key={accolade.id} component="button" type="button" data-carousel-dot aria-label={`Go to accolade ${index + 1}`} aria-current={index === active} aria-controls={carouselId} onClick={() => goTo(index)}
            sx={{ p: 0, border: 0, cursor: 'pointer', width: 18, height: 4, borderRadius: 2, transition: 'background-color .25s', bgcolor: index === active ? 'primary.main' : 'action.disabled' }} />
        ))}
      </Box>}
    </Card>
  )
}
