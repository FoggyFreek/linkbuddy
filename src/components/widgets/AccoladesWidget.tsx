import Box from '@mui/material/Box'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import Carousel from './Carousel.js'
import type { Accolade, LinkClickHandler, ResolvedAccoladesWidget } from '../../types.js'

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
  return <Carousel title={widget.title || 'Accolades'} itemLabel="accolade" items={widget.accolades} itemBorderRadius="18px"
    renderItem={(accolade) => accolade.url
      ? <CardActionArea component="a" href={accolade.url} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick(`accolade:${accolade.id}`)} sx={{ flex: 1, display: 'block', borderRadius: 'inherit' }}>
          <AccoladeContent accolade={accolade} />
        </CardActionArea>
      : <AccoladeContent accolade={accolade} />} />
}
