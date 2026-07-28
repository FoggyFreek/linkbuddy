import Box from '@mui/material/Box'
import SectionTitle from './SectionTitle.jsx'
import { WIDGETS } from './widgets/index.js'

export default function Section({ section, onLinkClick }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {section.title && <SectionTitle>{section.title}</SectionTitle>}
      {section.widgets.map((widget) => {
        const Widget = WIDGETS[widget.type]
        return Widget ? <Widget key={widget.id} widget={widget} onLinkClick={onLinkClick} /> : null
      })}
    </Box>
  )
}
