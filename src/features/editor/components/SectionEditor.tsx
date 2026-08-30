import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import AddIcon from '@mui/icons-material/Add'
import ItemOrderActions from './ItemOrderActions.js'
import WidgetListItem from './WidgetListItem.js'
import type useDragReorder from '../hooks/useDragReorder.js'
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
  { type: 'merch', label: 'Merch', needs: 'products' },
  { type: 'link', label: 'Custom link' },
  { type: 'embed', label: 'Embed' },
]

// One section card: its title field, ordering/delete controls, the list of
// widget rows, and the add menu. It owns the immutable widget-list
// transforms (remove/replace) and reports the resulting widget array up through
// `onUpdate`; section-level operations, and widget reordering (which can cross
// sections, so it can't be owned here), are callbacks from LayoutBuilder.
export default function SectionEditor({
  section,
  content,
  index,
  count,
  openWidget,
  setOpenWidget,
  canAdd,
  pageType,
  drag,
  onUpdate,
  onMove,
  onMoveWidgetByKey,
  onRemove,
  onAddWidget,
  onUnfurl,
}: Readonly<{
  section: DraftSection
  content: ContentSnapshot
  index: number
  count: number
  openWidget: string | null
  setOpenWidget: (id: string | null) => void
  canAdd: (needs?: 'songs' | 'products') => boolean
  pageType: PageType
  drag: ReturnType<typeof useDragReorder>
  onUpdate: (patch: Partial<DraftSection>) => void
  onMove: (delta: number) => void
  onMoveWidgetByKey: (index: number, delta: number) => boolean
  onRemove: () => void
  onAddWidget: (type: WidgetType) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}>) {
  const updateWidgets = (widgets: DraftWidget[]) => onUpdate({ widgets })
  const addTypes = ADD_TYPES.filter((t) => !(t.releaseOnly && pageType === 'main'))
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null)

  return (
    <Card variant="panel">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Section title (optional)"
          value={section.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value || null })}
        />
        <ItemOrderActions index={index} count={count} itemLabel="section" onMove={onMove} onDelete={onRemove} />
      </Stack>

      <Stack
        component="ul"
        spacing={1}
        {...drag.listProps(section.id, section.widgets.length)}
        sx={{ listStyle: 'none', m: '12px 0 0', p: 0, minHeight: 12 }}
      >
        {section.widgets.map((widget, widgetIndex) => (
          <WidgetListItem
            key={widget.id}
            widget={widget}
            content={content}
            open={openWidget === widget.id}
            index={widgetIndex}
            count={section.widgets.length}
            canMoveUp={widgetIndex > 0 || index > 0}
            canMoveDown={widgetIndex < section.widgets.length - 1 || index < count - 1}
            dragging={drag.isDragging({ sectionId: section.id, index: widgetIndex })}
            dropTarget={drag.isOver({ sectionId: section.id, index: widgetIndex })}
            handleProps={drag.handleProps(
              { sectionId: section.id, index: widgetIndex },
              widget.id,
              (delta) => onMoveWidgetByKey(widgetIndex, delta),
            )}
            rowProps={drag.rowProps({ sectionId: section.id, index: widgetIndex })}
            onToggle={() => setOpenWidget(openWidget === widget.id ? null : widget.id)}
            onMove={(delta) => {
              if (onMoveWidgetByKey(widgetIndex, delta)) drag.focusAfterMove(widget.id)
            }}
            onDelete={() => updateWidgets(section.widgets.filter((w) => w.id !== widget.id))}
            onChange={(next) => updateWidgets(section.widgets.map((w) => (w.id === widget.id ? next : w)))}
            onUnfurl={onUnfurl}
          />
        ))}
        {/* Drop marker for the end of the list — also the only target an empty section has. */}
        {drag.isOver({ sectionId: section.id, index: section.widgets.length }) && (
          <Box component="li" sx={{ height: 2, borderRadius: 1, bgcolor: 'primary.main' }} />
        )}
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
    </Card>
  )
}
