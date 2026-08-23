import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ShareButton from '../../../components/ShareButton.js'
import ColorModeToggle from '../../../components/ColorModeToggle.js'
import type { EditorPage } from '../../../types.js'

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
    <Box component="header">
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1 }}>
        linkBuddy
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>{saveLabel}</Typography>
        <ColorModeToggle />
        {publishedAt && <ShareButton variant="inline" url={page.publicUrl} title={title} />}
        <Button variant="outlined" onClick={onRefresh}>Refresh content</Button>
        {page.pageType === 'release' && <Button variant="outlined" onClick={onDelete}>Delete page</Button>}
        <Button variant="contained" onClick={onPublish}>{publishedAt ? 'Publish changes' : 'Publish'}</Button>
      </Stack>
       
        <Typography variant="h1" component="h1" sx={{ mt: 2, textAlign: 'center' }}>
          {title}
        </Typography>
      
      <Typography variant="h3" component="h1" sx={{ mt: 2, textAlign: 'center' }}>
        {page.pageType === 'release' ? 'release page' : 'link page'}
      </Typography>
    </Box>
  )
}
