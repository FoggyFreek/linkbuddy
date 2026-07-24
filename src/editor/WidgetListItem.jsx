import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
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
  isFirst,
  isLast,
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
        <IconButton size="small" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move widget up"><KeyboardArrowUpIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={() => onMove(1)} disabled={isLast} aria-label="Move widget down"><KeyboardArrowDownIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={onDelete} aria-label="Delete widget"><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      {open && (
        <Box sx={{ mt: 1.25 }}>
          <WidgetEditor widget={widget} content={content} onUnfurl={onUnfurl} onChange={onChange} />
        </Box>
      )}
    </Box>
  )
}
