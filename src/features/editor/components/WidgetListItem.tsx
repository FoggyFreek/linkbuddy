import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ItemOrderActions from './ItemOrderActions.js'
import { WidgetEditor } from './WidgetEditors.js'
import { widgetSummary } from '../utils/widgetModel.js'
import type { HTMLAttributes, RefCallback } from 'react'
import type { ContentSnapshot, DraftWidget, UnfurlResult } from '../../../types.js'

// One widget row in a section: the drag thumb that reorders it (across sections
// too — see useDragReorder), a summary button that toggles the inline editor,
// and explicit move/delete controls as a touch-compatible fallback. Purely
// presentational: every mutation is a callback from SectionEditor.
export default function WidgetListItem({
  widget,
  content,
  open,
  index,
  count,
  canMoveUp,
  canMoveDown,
  dragging,
  dropTarget,
  handleProps,
  rowProps,
  onToggle,
  onMove,
  onDelete,
  onChange,
  onUnfurl,
}: {
  widget: DraftWidget
  content: ContentSnapshot
  open: boolean
  index: number
  count: number
  canMoveUp: boolean
  canMoveDown: boolean
  dragging: boolean
  dropTarget: boolean
  handleProps: HTMLAttributes<HTMLElement> & { ref: RefCallback<HTMLElement> }
  rowProps: HTMLAttributes<HTMLElement>
  onToggle: () => void
  onMove: (delta: number) => void
  onDelete: () => void
  onChange: (widget: DraftWidget) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}) {
  return (
    <Box
      component="li"
      {...rowProps}
      sx={(theme) => ({
        border: '1px solid',
        borderColor: dropTarget ? 'primary.main' : 'divider',
        borderRadius: `${theme.shape.item}px`,
        p: '8px 10px',
        opacity: dragging ? 0.4 : 1,
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box
          {...handleProps}
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
            cursor: 'grab',
            borderRadius: 1,
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
            '&:hover': { color: 'text.primary' },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
        <Button
          onClick={onToggle}
          sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', fontWeight: 400 }}
        >
          {widgetSummary(widget, content)}
        </Button>
        <ItemOrderActions
          index={index}
          count={count}
          itemLabel="widget"
          onMove={onMove}
          onDelete={onDelete}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </Stack>
      {open && (
        <Box sx={{ mt: 1.25 }}>
          <WidgetEditor widget={widget} content={content} onUnfurl={onUnfurl} onChange={onChange} />
        </Box>
      )}
    </Box>
  )
}
