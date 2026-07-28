import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import ItemOrderActions from './ItemOrderActions.jsx'
import WidgetListItem from './WidgetListItem.jsx'

// The widget types the "Add:" row offers, and the content each one needs before
// it can be added (a song/platforms widget needs songs, merch needs products).
// `releaseOnly` types are hidden on the main link page: platform buttons point
// at one release's streaming links, so they only make sense on a release page.
const ADD_TYPES = [
  { type: 'song', label: 'Song', needs: 'songs' },
  { type: 'platforms', label: 'Platform buttons', needs: 'songs', releaseOnly: true },
  { type: 'gigs', label: 'Gigs' },
  { type: 'merch', label: 'Merch', needs: 'products' },
  { type: 'link', label: 'Custom link' },
  { type: 'embed', label: 'Embed' },
]

// One section card: its title field, ordering/delete controls, the list of
// widget rows, and the "Add:" palette. It owns the immutable widget-list
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
}) {
  const updateWidgets = (widgets) => onUpdate({ widgets })
  const addTypes = ADD_TYPES.filter((t) => !(t.releaseOnly && pageType === 'main'))

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

      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary">Add:</Typography>
        {addTypes.map((t) => (
          <Button key={t.type} size="small" variant="pill" onClick={() => onAddWidget(t.type)} disabled={!canAdd(t.needs)}>
            {t.label}
          </Button>
        ))}
      </Stack>
    </Card>
  )
}
