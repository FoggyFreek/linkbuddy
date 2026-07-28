import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PageContent from '../../../components/PageContent.jsx'
import ColorSchemeScope from '../../../components/ColorSchemeScope.jsx'
import { pageBackgroundSx } from '../../../lib/pageBackgrounds.js'

// The Preview tab body: renders the public page's content (PageContent)
// inside a framed ColorSchemeScope forced to the page's scheme (preview.theme,
// resolved server-side the same way as the live page). It's the same scope +
// stack the live public page uses (content card included), so the preview
// can't drift from the content visitors see; it deliberately omits the page's
// surrounding chrome (share button, privacy footer, viewport spacing, click
// tracking). Its scheme is independent of the editor's own (a dark editor can
// show a light preview and vice-versa).
export default function PagePreview({ preview }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" align="center">Preview of the public page content.</Typography>
      <ColorSchemeScope
        mode={preview.theme === 'dark' ? 'dark' : 'light'}
        sx={[
          (theme) => ({ border: '1px solid', borderColor: 'divider', borderRadius: `${theme.shape.preview}px`, p: '40px 16px 24px' }),
          // The same background `sx` the public page uses, so the chosen artwork
          // shows here exactly as visitors will see it.
          pageBackgroundSx(preview.background),
        ]}
      >
        <PageContent page={preview} />
      </ColorSchemeScope>
    </Stack>
  )
}
