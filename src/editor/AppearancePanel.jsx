import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
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
// Build tab). These settings are stored on the layout like everything else the
// editor writes, so they autosave, preview and publish through the existing path.
export default function AppearancePanel({
  background,
  schemeMode,
  onSetBackground,
  bannerUrl,
  showBanner,
  onSetShowBanner,
  theme,
  autoTheme,
  onSetTheme,
}) {
  return (
    <Stack spacing={2}>
      <AppearanceSection
        title="Theme"
        hint={`Light or dark surfaces for this page's card and content. Auto picks ${autoTheme} for this page.`}
      >
        <ToggleButtonGroup
          value={theme || 'auto'}
          exclusive
          size="small"
          onChange={(e, value) => value && onSetTheme(value === 'auto' ? null : value)}
        >
          <ToggleButton value="auto">Auto</ToggleButton>
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
      </AppearanceSection>

      <AppearanceSection
        title="Background"
        hint="Artwork behind your page. Your content card stays on top of it, so text stays readable."
      >
        <BackgroundPicker value={background} mode={schemeMode} onChange={onSetBackground} />
      </AppearanceSection>

      <AppearanceSection
        title="Banner image"
        hint={
          bannerUrl
            ? 'Shows your GigBuddy banner across the top of the page, with your profile picture overlapping it.'
            : 'Set a banner image in GigBuddy to enable this.'
        }
      >
        <FormControlLabel
          disabled={!bannerUrl}
          control={<Switch checked={!!bannerUrl && showBanner} onChange={(e) => onSetShowBanner(e.target.checked)} />}
          label="Show band banner"
        />
        {bannerUrl && (
          <Box
            component="img"
            src={bannerUrl}
            alt=""
            sx={{ mt: 1.5, width: '100%', maxWidth: 360, height: 90, objectFit: 'cover', borderRadius: 1, display: 'block' }}
          />
        )}
      </AppearanceSection>
    </Stack>
  )
}
