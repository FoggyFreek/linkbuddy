import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import ItemOrderActions from './ItemOrderActions.jsx'
import WidgetListItem from './WidgetListItem.jsx'
import { moveItem } from '../editorUtils.js'

// The widget types the "Add:" row offers, and the content each one needs before
// it can be added (a song/platforms widget needs songs, merch needs products).
const ADD_TYPES = [
  { type: 'song', label: 'Song', needs: 'songs' },
  { type: 'platforms', label: 'Platform buttons', needs: 'songs' },
  { type: 'gigs', label: 'Gigs' },
  { type: 'merch', label: 'Merch', needs: 'products' },
  { type: 'link', label: 'Link' },
  { type: 'embed', label: 'Embed' },
]

// One section card: its title field, ordering/delete controls, the list of
// widget rows, and the "Add:" palette. It owns the immutable widget-list
// transforms (move/remove/replace) and reports the resulting widget array up
// through `onUpdate`; section-level operations are callbacks from LayoutBuilder.
export default function SectionEditor({
  section,
  content,
  index,
  count,
  openWidget,
  setOpenWidget,
  canAdd,
  onUpdate,
  onMove,
  onRemove,
  onAddWidget,
  onUnfurl,
}) {
  const updateWidgets = (widgets) => onUpdate({ widgets })

  return (
    <Card sx={{ p: '14px 16px' }}>
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

      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: '12px 0 0', p: 0 }}>
        {section.widgets.map((widget, widgetIndex) => (
          <WidgetListItem
            key={widget.id}
            widget={widget}
            content={content}
            open={openWidget === widget.id}
            index={widgetIndex}
            count={section.widgets.length}
            onToggle={() => setOpenWidget(openWidget === widget.id ? null : widget.id)}
            onMove={(delta) => updateWidgets(moveItem(section.widgets, widgetIndex, delta))}
            onDelete={() => updateWidgets(section.widgets.filter((w) => w.id !== widget.id))}
            onChange={(next) => updateWidgets(section.widgets.map((w) => (w.id === widget.id ? next : w)))}
            onUnfurl={onUnfurl}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary">Add:</Typography>
        {ADD_TYPES.map((t) => (
          <Button key={t.type} size="small" variant="outlined" onClick={() => onAddWidget(t.type)} disabled={!canAdd(t.needs)} sx={{ borderRadius: 999, borderStyle: 'dashed' }}>
            {t.label}
          </Button>
        ))}
      </Stack>
    </Card>
  )
}
