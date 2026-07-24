import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ShareButton from '../ShareButton.jsx'
import ColorModeToggle from '../ColorModeToggle.jsx'

// The page header: the current page's title + save status on the left, and the
// per-page actions (theme toggle, share, refresh, delete, preview, publish) on
// the right. `title` is the visitor-facing page label the parent computes.
export default function EditorHeader({
  page,
  title,
  saveLabel,
  publishedAt,
  onRefresh,
  onDelete,
  onPreview,
  onPublish,
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="h2" component="h1">
          {title} — {page.pageType === 'release' ? 'release page' : 'link page'}
        </Typography>
        <Typography variant="caption" color="text.secondary">{saveLabel}</Typography>
      </Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <ColorModeToggle />
        {publishedAt && <ShareButton variant="inline" url={page.publicUrl} title={title} />}
        <Button variant="outlined" onClick={onRefresh}>Refresh content</Button>
        {page.pageType === 'release' && <Button variant="outlined" onClick={onDelete}>Delete page</Button>}
        <Button variant="outlined" onClick={onPreview}>Preview</Button>
        <Button variant="contained" onClick={onPublish}>{publishedAt ? 'Publish changes' : 'Publish'}</Button>
      </Stack>
    </Box>
  )
}
