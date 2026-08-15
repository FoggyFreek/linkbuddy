import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ShareButton from '../../../components/ShareButton.js'
import ColorModeToggle from '../../../components/ColorModeToggle.js'
import type { EditorPage } from '../../../types.js'

// The page header: save status and the per-page actions (theme toggle, share,
// refresh, delete, publish) on the top row, with the current page's title
// centred below. `title` is the visitor-facing page label the parent computes.
export default function EditorHeader({
  page,
  title,
  saveLabel,
  publishedAt,
  onRefresh,
  onDelete,
  onPublish,
}: {
  page: EditorPage
  title: string
  saveLabel: string
  publishedAt: string | null
  onRefresh: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onPublish: () => void | Promise<void>
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>{saveLabel}</Typography>
        <ColorModeToggle />
        {publishedAt && <ShareButton variant="inline" url={page.publicUrl} title={title} />}
        <Button variant="outlined" onClick={onRefresh}>Refresh content</Button>
        {page.pageType === 'release' && <Button variant="outlined" onClick={onDelete}>Delete page</Button>}
        <Button variant="contained" onClick={onPublish}>{publishedAt ? 'Publish changes' : 'Publish'}</Button>
      </Stack>
      <Typography variant="h2" component="h1" sx={{ mt: 2, textAlign: 'center' }}>
        {title} — {page.pageType === 'release' ? 'release page' : 'link page'}
      </Typography>
    </Box>
  )
}
