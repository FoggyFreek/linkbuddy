import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'

const OVERLAP = 24
const CARD = 'min(52cqi, 196px)'
const EDGE = 'calc(50cqi - min(26cqi, 98px))'

const arrowSx = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 3,
  width: 40, height: 40, p: 0, bgcolor: 'transparent', color: 'text.primary',
  '&:hover': { bgcolor: 'transparent', opacity: 0.6 },
} as const

export default function Carousel<T extends { id: number | string }>({
  title, itemLabel, items, itemBorderRadius, squareItems = false, renderItem,
}: Readonly<{
  title: string
  itemLabel: string
  items: T[]
  itemBorderRadius: string
  squareItems?: boolean
  renderItem: (item: T) => ReactNode
}>) {
  const carouselId = useId()
  const carouselRef = useRef<HTMLDivElement>(null)
  const count = items.length
  const initial = count > 2 ? 1 : 0
  const [active, setActive] = useState(initial)

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
  return <Card elevation={0} sx={{ p: '16px 0 12px', minWidth: 0, border: 0, borderRadius: 0, bgcolor: 'transparent', boxShadow: 'none' }}>
    <Typography variant="h4" component="h3" sx={{ textAlign: 'center', mx: '16px', mb: '12px', overflowWrap: 'anywhere' }}>{title}</Typography>
    <Box sx={{ position: 'relative', minWidth: 0, containerType: 'inline-size' }}>
      {count > 1 && <IconButton aria-label={`Previous ${itemLabel}`} aria-controls={carouselId} onClick={() => goTo(active - 1)} sx={{ ...arrowSx, left: 4 }}><ChevronLeft fontSize="large" /></IconButton>}
      {count > 1 && <IconButton aria-label={`Next ${itemLabel}`} aria-controls={carouselId} onClick={() => goTo(active + 1)} sx={{ ...arrowSx, right: 4 }}><ChevronRight fontSize="large" /></IconButton>}
      <Box id={carouselId} ref={carouselRef} role="region" aria-roledescription="carousel" aria-label={title} tabIndex={0}
        onScroll={(event) => setActive(Math.min(count - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / step()))))}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
          }
        }}
        sx={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', px: EDGE, pb: 1, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {items.map((item, index) => <Card key={item.id} component="article" elevation={0}
          sx={{ flex: `0 0 ${CARD}`, width: CARD, ...(squareItems ? { height: CARD, alignSelf: 'flex-start' } : { display: 'flex', flexDirection: 'column' }), minWidth: 0, ml: index === 0 ? 0 : `-${OVERLAP}px`, scrollSnapAlign: 'center', borderRadius: itemBorderRadius, overflow: 'hidden', bgcolor: 'background.paper', position: 'relative', transition: 'opacity .3s ease, transform .3s ease, box-shadow .3s ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' }, ...(index === active
            ? { zIndex: 2, opacity: 1, transform: 'none', boxShadow: 6 }
            : { zIndex: 1, opacity: 0.55, transform: 'scale(0.88)', boxShadow: 1 }) }}>
          {renderItem(item)}
        </Card>)}
      </Box>
    </Box>
    {count > 1 && <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', mt: '10px', px: '16px' }}>
      {items.map((item, index) => <Box key={item.id} component="button" type="button" data-carousel-dot aria-label={`Go to ${itemLabel} ${index + 1}`} aria-current={index === active} aria-controls={carouselId} onClick={() => goTo(index)}
        sx={{ p: 0, border: 0, cursor: 'pointer', width: 18, height: 4, borderRadius: 2, transition: 'background-color .25s', bgcolor: index === active ? 'primary.main' : 'action.disabled' }} />)}
    </Box>}
  </Card>
}
