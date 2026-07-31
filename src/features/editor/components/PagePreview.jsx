import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PreviewContent from '../../../components/PreviewContent.jsx'
import PageScope from '../../../components/PageScope.jsx'

// The Preview tab body: renders the public page's content (PreviewContent)
// inside a framed PageScope — the same scheme + background artwork the live
// page resolves for this payload, so the preview can't drift from the content
// visitors see. It deliberately omits the page's surrounding chrome (share
// button, attribution, privacy footer, viewport spacing, click tracking). Its
// scheme is independent of the editor's own (a dark editor can show a light
// preview and vice-versa).
export default function PagePreview({ preview }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" align="center">Preview of the public page content.</Typography>
      <PageScope
        page={preview}
        sx={(theme) => ({ border: '1px solid', borderColor: 'divider', borderRadius: `${theme.shape.preview}px`, p: '40px 16px 24px' })}
      >
        <PreviewContent page={preview} />
      </PageScope>
    </Stack>
  )
}
