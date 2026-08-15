import Box from '@mui/material/Box'
import SectionTitle from './SectionTitle.js'
import { WIDGETS } from './widgets/index.js'
import type { LinkClickHandler, ResolvedSection } from '../types.js'

export default function Section({ section, onLinkClick }: { section: ResolvedSection; onLinkClick: LinkClickHandler }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {section.title && <SectionTitle>{section.title}</SectionTitle>}
      {section.widgets.map((widget) => {
        const Widget = WIDGETS[widget.type] as React.ComponentType<{ widget: typeof widget; onLinkClick: LinkClickHandler }> | undefined
        return Widget ? <Widget key={widget.id} widget={widget} onLinkClick={onLinkClick} /> : null
      })}
    </Box>
  )
}
