import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import ItemOrderActions from './ItemOrderActions.jsx'
import { WidgetEditor } from '../widgets/WidgetEditors.jsx'
import { widgetSummary } from '../widgets/widgetModel.js'

// One widget row in a section: a summary button that toggles the inline editor,
// plus move/delete controls. Purely presentational — every mutation is a
// callback the SectionEditor supplies, keeping the immutable list transforms in
// one place.
export default function WidgetListItem({
  widget,
  content,
  open,
  index,
  count,
  onToggle,
  onMove,
  onDelete,
  onChange,
  onUnfurl,
}) {
  return (
    <Box component="li" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: '8px 10px' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button
          onClick={onToggle}
          sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', fontWeight: 400 }}
        >
          {widgetSummary(widget, content)}
        </Button>
        <ItemOrderActions index={index} count={count} itemLabel="widget" onMove={onMove} onDelete={onDelete} />
      </Stack>
      {open && (
        <Box sx={{ mt: 1.25 }}>
          <WidgetEditor widget={widget} content={content} onUnfurl={onUnfurl} onChange={onChange} />
        </Box>
      )}
    </Box>
  )
}
