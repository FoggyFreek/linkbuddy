import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import WidgetStack from '../WidgetStack.jsx'

// The Preview tab body: renders the exact public page inside a framed container
// that forces the band's chosen colour scheme on a NESTED element (see
// CLAUDE.md / nestedTheme.test.jsx). Reuses WidgetStack so preview can't drift
// from what visitors see.
export default function PagePreview({ preview }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" align="center">This is exactly what visitors see.</Typography>
      <Box
        data-theme={preview.band?.theme === 'dark' ? 'dark' : 'light'}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '24px', bgcolor: 'background.default', color: 'text.primary', p: '40px 16px 24px' }}
      >
        <WidgetStack page={preview} />
      </Box>
    </Stack>
  )
}
