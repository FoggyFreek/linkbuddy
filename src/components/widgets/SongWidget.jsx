import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import { PLATFORM_ICON_COMPONENTS } from '../icons.jsx'
import Thumb from '../Thumb.jsx'
import CardLabel from '../CardLabel.jsx'

export default function SongWidget({ widget, onLinkClick }) {
  const primary = widget.links[0]
  const extras = widget.links.slice(1)
  return (
    <Card sx={{ p: '10px 14px' }}>
      <CardActionArea
        component="a"
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`song:${primary.label || 'listen'}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}
      >
        <Thumb src={widget.coverUrl} />
        <CardLabel label={widget.title} sublabel={widget.artist} sx={{ pr: '56px' }} />
      </CardActionArea>
      {extras.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center', pt: '10px', px: '4px' }}>
          {extras.map((link) => {
            // A known platform renders as its icon; anything else a text pill.
            const platformId = link.platform && link.platform.id !== 'other' ? link.platform.id : null
            const Icon = platformId ? PLATFORM_ICON_COMPONENTS[platformId] : null
            return Icon ? (
              <IconButton
                key={link.url}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.platform.label}
                title={link.platform.label}
                onClick={() => onLinkClick(`platform:${platformId}`)}
                sx={{ color: 'text.primary', borderRadius: '10px', '&:hover': { bgcolor: 'surface.s2' } }}
              >
                <Icon size={26} />
              </IconButton>
            ) : (
              <Chip
                key={link.url}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                size="small"
                label={link.label || 'Listen'}
                onClick={() => onLinkClick(`song:${link.label || 'listen'}`)}
                sx={{ bgcolor: 'surface.s2', '&:hover': { bgcolor: 'surface.s3' } }}
              />
            )
          })}
        </Stack>
      )}
    </Card>
  )
}
