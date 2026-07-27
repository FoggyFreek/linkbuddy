import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BackgroundPicker from './BackgroundPicker.jsx'

// One titled block of the Appearance tab. Every appearance setting gets the same
// panel card, heading and helper line, so adding the next one (colour scheme,
// card style, fonts…) is a matter of dropping another <AppearanceSection> in
// below rather than inventing new chrome.
function AppearanceSection({ title, hint, children }) {
  return (
    <Card variant="panel">
      <Typography variant="h6" component="h2">{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{hint}</Typography>}
      {children}
    </Card>
  )
}

// The Appearance tab body: how the page looks, as opposed to what's on it (the
// Build tab). Today that's one section — the page background — stored on the
// layout like everything else the editor writes, so it autosaves, previews and
// publishes through the existing path.
export default function AppearancePanel({ background, schemeMode, onSetBackground }) {
  return (
    <Stack spacing={2}>
      <AppearanceSection
        title="Background"
        hint="Artwork behind your page. Your content card stays on top of it, so text stays readable."
      >
        <BackgroundPicker value={background} mode={schemeMode} onChange={onSetBackground} />
      </AppearanceSection>
    </Stack>
  )
}
