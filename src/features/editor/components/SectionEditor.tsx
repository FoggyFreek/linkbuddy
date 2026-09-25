import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import Collapse from '@mui/material/Collapse'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import Typography from '@mui/material/Typography'
import DragHandle from './DragHandle.js'
import { DropMarkers, dropItemSx } from './DropIndicators.js'
import WidgetListItem from './WidgetListItem.js'
import type { HTMLAttributes, RefCallback } from 'react'
import type useDragReorder from '../hooks/useDragReorder.js'
import type { ItemDropState } from '../hooks/useDragReorder.js'
import type { ContentSnapshot, DraftSection, DraftWidget, PageType, UnfurlResult, WidgetType } from '../../../types.js'

// The widget types the add menu offers, and the content each one needs before
// it can be added (a song/platforms widget needs songs, merch needs products).
// `releaseOnly` types are hidden on the main link page: platform buttons point
// at one release's streaming links, so they only make sense on a release page.
interface AddType { type: WidgetType; label: string; needs?: 'songs' | 'products'; releaseOnly?: boolean }
const ADD_TYPES: AddType[] = [
  { type: 'song', label: 'Song', needs: 'songs' },
  { type: 'platforms', label: 'Platform buttons', needs: 'songs', releaseOnly: true },
  { type: 'gigs', label: 'Gigs' },
  { type: 'accolades', label: 'Accolades' },
  { type: 'discography', label: 'Discography' },
  { type: 'merch', label: 'Merch', needs: 'products' },
  { type: 'link', label: 'Custom link' },
  { type: 'embed', label: 'Embed' },
]

// One section card: its drag thumb and title field, the delete control, the
// list of widget rows, and the add menu. It owns the immutable widget-list
// transforms (remove/replace) and reports the resulting widget array up through
// `onUpdate`; section-level operations, and all reordering (a widget can cross
// sections, so it can't be owned here), are callbacks from LayoutBuilder.
// While a section is being dragged every card is `collapsed` to its header.
export const SECTION_COLLAPSE_MS = 200

export default function SectionEditor({
  section,
  content,
  openWidget,
  setOpenWidget,
  canAdd,
  pageType,
  collapsed = false,
  drop,
  handleProps,
  itemProps,
  widgetDrag,
  onUpdate,
  onMoveWidgetByKey,
  onRemove,
  onAddWidget,
  onUnfurl,
}: Readonly<{
  section: DraftSection
  content: ContentSnapshot
  openWidget: string | null
  setOpenWidget: (id: string | null) => void
  canAdd: (needs?: 'songs' | 'products') => boolean
  pageType: PageType
  collapsed?: boolean
  drop: ItemDropState
  handleProps: HTMLAttributes<HTMLElement> & { ref: RefCallback<HTMLElement> }
  itemProps: Record<string, string>
  widgetDrag: ReturnType<typeof useDragReorder>
  onUpdate: (patch: Partial<DraftSection>) => void
  onMoveWidgetByKey: (index: number, delta: number) => boolean
  onRemove: () => void
  onAddWidget: (type: WidgetType) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}>) {
  const updateWidgets = (widgets: DraftWidget[]) => onUpdate({ widgets })
  const addTypes = ADD_TYPES.filter((t) => !(t.releaseOnly && pageType === 'main'))
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null)
  const count = section.widgets.length

  return (
    <Card variant="panel" {...itemProps} sx={(theme) => ({ position: 'relative', overflow: 'visible', ...dropItemSx(theme, drop) })}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DragHandle {...handleProps} />
        <TextField
          size="small"
          fullWidth
          placeholder="Section title (optional)"
          value={section.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value || null })}
        />
        {collapsed && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {count === 1 ? '1 widget' : `${count} widgets`}
          </Typography>
        )}
        <IconButton size="small" onClick={onRemove} aria-label="Delete section"><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      <Collapse in={!collapsed} timeout={SECTION_COLLAPSE_MS}>
        <Stack
          component="ul"
          spacing={1}
          {...widgetDrag.listProps(section.id)}
          sx={{ listStyle: 'none', m: '12px 0 0', p: 0 }}
        >
          {section.widgets.map((widget, widgetIndex) => {
            const spot = { list: section.id, index: widgetIndex }
            return (
              <WidgetListItem
                key={widget.id}
                widget={widget}
                content={content}
                open={openWidget === widget.id}
                drop={widgetDrag.itemState(spot, widgetIndex === count - 1)}
                handleProps={widgetDrag.handleProps(spot, widget.id, (delta) => onMoveWidgetByKey(widgetIndex, delta))}
                itemProps={widgetDrag.itemProps}
                onToggle={() => setOpenWidget(openWidget === widget.id ? null : widget.id)}
                onDelete={() => updateWidgets(section.widgets.filter((w) => w.id !== widget.id))}
                onChange={(next) => updateWidgets(section.widgets.map((w) => (w.id === widget.id ? next : w)))}
                onUnfurl={onUnfurl}
              />
            )
          })}
          {count === 0 && <EmptyDropZone active={widgetDrag.active} targeted={widgetDrag.insertAt({ list: section.id, index: 0 })} />}
        </Stack>

        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Add">
            <IconButton size="small" aria-label="Add" onClick={(e) => setAddAnchor(e.currentTarget)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
            {addTypes.map((t) => (
              <MenuItem
                key={t.type}
                disabled={!canAdd(t.needs)}
                onClick={() => {
                  setAddAnchor(null)
                  onAddWidget(t.type)
                }}
              >
                {t.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Collapse>

      <DropMarkers state={drop} gap={2} />
    </Card>
  )
}

// An empty section's list: always the same size, so a drag never shifts layout.
function EmptyDropZone({ active, targeted }: Readonly<{ active: boolean; targeted: boolean }>) {
  return (
    <Box
      component="li"
      data-drop-indicator={targeted ? 'empty' : undefined}
      sx={(theme) => ({
        py: 1,
        textAlign: 'center',
        typography: 'body2',
        color: targeted ? 'primary.main' : 'text.secondary',
        border: '1px dashed',
        borderColor: targeted ? 'primary.main' : active ? 'text.disabled' : 'divider',
        borderRadius: `${theme.shape.item}px`,
        bgcolor: targeted ? `rgba(${theme.vars!.palette.primary.mainChannel} / 0.08)` : 'transparent',
      })}
    >
      {active ? 'Drop here' : 'No widgets yet'}
    </Box>
  )
}
