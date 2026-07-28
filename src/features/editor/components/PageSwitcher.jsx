import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'

// The chip row for switching between the tenant's pages plus the "New release
// page" chip. `labelFor` maps a page-list entry to its visitor-facing name;
// `hasSongs` gates release creation (a release needs a song with links).
export default function PageSwitcher({ pages, currentId, hasSongs, labelFor, onSelect, onNewRelease }) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
      {pages.map((p) => (
        <Chip
          key={p.id}
          label={`${p.pageType === 'main' ? '★ ' : ''}${labelFor(p)}${!p.publishedAt && p.id !== currentId ? ' (draft)' : ''}`}
          color={p.id === currentId ? 'primary' : 'default'}
          variant={p.id === currentId ? 'filled' : 'outlined'}
          onClick={() => onSelect(p.id)}
        />
      ))}
      <Chip
        icon={<AddIcon />}
        label="New release page"
        variant="outlined"
        onClick={onNewRelease}
        disabled={!hasSongs}
        title={hasSongs ? '' : 'Add streaming links to a song in GigBuddy first'}
        sx={{ borderStyle: 'dashed' }}
      />
    </Stack>
  )
}
