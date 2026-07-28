import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import ButtonBase from '@mui/material/ButtonBase'
import { EmbedOverlay } from '../embeds.jsx'
import { PLATFORM_ICON_COMPONENTS } from '../icons.jsx'
import Thumb from '../Thumb.jsx'
import CardLabel from '../CardLabel.jsx'
import PlayPill from '../PlayPill.jsx'

const OtherPlatformIcon = PLATFORM_ICON_COMPONENTS.other

// A pasted URL. Embeddable platforms get a facade that opens the player in a
// closable overlay (never on page view — see PRIVACY.md); anything else an
// Open Graph link card.
export default function EmbedWidget({ widget, onLinkClick }) {
  const [playing, setPlaying] = useState(null)
  const embed = widget.embed
  const label = widget.title || widget.url

  const openPlayer = () => {
    onLinkClick(`embed:${embed.type}`)
    setPlaying(embed)
  }
  const player = (
    <EmbedOverlay
      embed={playing}
      title={widget.title}
      url={widget.url}
      onOpenExternal={() => onLinkClick(`link:${label}`)}
      onClose={() => setPlaying(null)}
    />
  )

  if (embed?.display === 'inline') {
    return (
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: '8px', p: '10px 14px' }}>
        <ButtonBase
          onClick={openPlayer}
          sx={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'flex-start', textAlign: 'inherit' }}
        >
          <Thumb src={widget.imageUrl} />
          <CardLabel label={label} sublabel={widget.description} />
          <PlayPill />
        </ButtonBase>
        {player}
      </Card>
    )
  }

  if (embed?.display === 'overlay') {
    return (
      <Card sx={{ p: '0 0 10px', overflow: 'hidden' }}>
        <ButtonBase
          onClick={openPlayer}
          sx={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', bgcolor: '#0c0d0f', overflow: 'hidden' }}
        >
          {widget.imageUrl && <Box component="img" src={widget.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <Box component="span" aria-hidden="true" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgb(12 13 15 / 0.75)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', pl: '5px' }}>▶</Box>
        </ButtonBase>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', p: '10px 14px 0' }}>
          <CardLabel label={label} sublabel={widget.description} />
        </Box>
        {player}
      </Card>
    )
  }

  return (
    <Card>
      <CardActionArea
        component="a"
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`link:${label}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 64, p: '12px 16px' }}
      >
        {widget.imageUrl ? (
          <Thumb src={widget.imageUrl} />
        ) : (
          <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><OtherPlatformIcon size={26} /></Box>
        )}
        <CardLabel label={label} sublabel={widget.description} sx={{ pr: '26px' }} />
      </CardActionArea>
    </Card>
  )
}
