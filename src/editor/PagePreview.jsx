import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import WidgetStack from '../WidgetStack.jsx'
import ColorSchemeScope from '../ColorSchemeScope.jsx'

// The Preview tab body: renders the exact public page inside a framed
// ColorSchemeScope forced to the band's chosen scheme. It's the same scope
// component the live public page uses, so the preview can't drift from what
// visitors see, and its scheme is independent of the editor's own (a dark editor
// can show a light preview and vice-versa).
export default function PagePreview({ preview }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" align="center">This is exactly what visitors see.</Typography>
      <ColorSchemeScope
        mode={preview.band?.theme === 'dark' ? 'dark' : 'light'}
        sx={(theme) => ({ border: '1px solid', borderColor: 'divider', borderRadius: `${theme.shape.preview}px`, p: '40px 16px 24px' })}
      >
        <WidgetStack page={preview} />
      </ColorSchemeScope>
    </Stack>
  )
}
