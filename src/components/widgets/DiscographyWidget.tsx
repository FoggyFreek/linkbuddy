import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Carousel from './Carousel.js'
import type { Album, ResolvedDiscographyWidget, LinkClickHandler } from '../../types.js'

function AlbumContent({ album }: Readonly<{ album: Album }>) {
  const year = album.releaseDate?.slice(0, 4)
  const coverUrl = album.coverUrl || album.coverHighResolutionUrl
  return <>
    {coverUrl && <Box component="img" src={coverUrl} alt={`${album.title} album art`} loading="lazy" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />}
    <Box sx={{ position: 'absolute', inset: 'auto 0 0', p: 1.5, color: '#fff', background: coverUrl ? 'linear-gradient(transparent, rgba(0, 0, 0, .86))' : 'linear-gradient(#31313a, #17171d)' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{album.title}</Typography>
      {year && <Typography component="time" dateTime={album.releaseDate!} variant="caption" sx={{ display: 'block', color: 'inherit' }}>{year}</Typography>}
    </Box>
  </>
}

export default function DiscographyWidget({ widget }: Readonly<{ widget: ResolvedDiscographyWidget; onLinkClick: LinkClickHandler }>) {
  return <Carousel title={widget.title || 'Discography'} itemLabel="album" items={widget.discography} itemBorderRadius="0px" squareItems
    renderItem={(album) => <AlbumContent album={album} />} />
}
