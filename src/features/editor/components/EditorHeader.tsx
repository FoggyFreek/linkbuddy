import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useColorScheme } from '@mui/material/styles'
import ShareButton from '../../../components/ShareButton.js'
import ColorModeToggle from '../../../components/ColorModeToggle.js'
import type { EditorPage } from '../../../types.js'

function LinkBuddyLogo() {
  const { mode, systemMode } = useColorScheme()
  const effectiveMode = mode === 'system' ? systemMode : mode

  return (
    <Box
      component="img"
      src={`/icons/${effectiveMode === 'dark' ? 'lb_blue_drk_txt_600' : 'lb_blue_txt_600'}.png`}
      alt="linkBuddy"
      sx={{ display: 'block', width: '120px', height: 'auto', mx: 'auto', mb: 1 }}
    />
  )
}

export default function EditorHeader({
  page,
  title,
  saveLabel,
  publishedAt,
  onRefresh,
  onDelete,
  onPublish,
}: Readonly<{
  page: EditorPage
  title: string
  saveLabel: string
  publishedAt: string | null
  onRefresh: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onPublish: () => void | Promise<void>
}>) {
  return (
    <Box component="header">
      <LinkBuddyLogo />
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
