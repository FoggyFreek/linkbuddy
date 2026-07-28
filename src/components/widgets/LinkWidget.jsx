import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import { LINK_ICON_COMPONENTS } from '../icons.jsx'
import Thumb from '../Thumb.jsx'
import CardLabel from '../CardLabel.jsx'

export default function LinkWidget({ widget, onLinkClick }) {
  const Icon = LINK_ICON_COMPONENTS[widget.icon] || LINK_ICON_COMPONENTS.globe
  return (
    <Card>
      <CardActionArea
        component="a"
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`link:${widget.label}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 64, p: '12px 16px' }}
      >
        {widget.imageUrl ? (
          <Thumb src={widget.imageUrl} />
        ) : (
          <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><Icon size={26} /></Box>
        )}
        <CardLabel label={widget.label} sublabel={widget.sublabel} sx={{ pr: '26px' }} />
      </CardActionArea>
    </Card>
  )
}
