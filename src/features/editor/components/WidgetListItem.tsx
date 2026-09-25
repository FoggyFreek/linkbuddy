import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { WidgetEditor } from './WidgetEditors.js'
import DragHandle from './DragHandle.js'
import { DropMarkers, dropItemSx } from './DropIndicators.js'
import { widgetSummary } from '../utils/widgetModel.js'
import type { HTMLAttributes, RefCallback } from 'react'
import type { ItemDropState } from '../hooks/useDragReorder.js'
import type { ContentSnapshot, DraftWidget, UnfurlResult } from '../../../types.js'

// One widget row in a section: the drag thumb that reorders it (across sections
// too — see useDragReorder), a summary button that toggles the inline editor,
// and a delete control. Purely presentational: every mutation is a callback
// from SectionEditor.
export default function WidgetListItem({
  widget,
  content,
  open,
  drop,
  handleProps,
  itemProps,
  onToggle,
  onDelete,
  onChange,
  onUnfurl,
}: Readonly<{
  widget: DraftWidget
  content: ContentSnapshot
  open: boolean
  drop: ItemDropState
  handleProps: HTMLAttributes<HTMLElement> & { ref: RefCallback<HTMLElement> }
  itemProps: Record<string, string>
  onToggle: () => void
  onDelete: () => void
  onChange: (widget: DraftWidget) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}>) {
  return (
    <Box
      component="li"
      {...itemProps}
      sx={(theme) => ({
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${theme.shape.item}px`,
        p: '8px 10px',
        ...dropItemSx(theme, drop),
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DragHandle {...handleProps} />
        <Button
          onClick={onToggle}
          sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', fontWeight: 400 }}
        >
          {widgetSummary(widget, content)}
        </Button>
        <IconButton size="small" onClick={onDelete} aria-label="Delete widget"><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      {open && (
        <Box sx={{ mt: 1.25 }}>
          <WidgetEditor widget={widget} content={content} onUnfurl={onUnfurl} onChange={onChange} />
        </Box>
      )}
      <DropMarkers state={drop} gap={1} />
    </Box>
  )
}
