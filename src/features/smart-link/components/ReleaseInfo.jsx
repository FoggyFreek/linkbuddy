import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function ReleaseInfo({ release }) {
  return (
    <Box component="header" sx={{ textAlign: 'center', mb: '4px', '@container (min-width:840px)': { textAlign: 'left', mb: '8px' } }}>
      <Typography variant="h2" sx={{ mb: '4px' }}>{release.title}</Typography>
      {release.artist && <Typography variant="subtitle2" component="p" color="text.secondary" sx={{ mb: '10px' }}>{release.artist}</Typography>}
    </Box>
  )
}
