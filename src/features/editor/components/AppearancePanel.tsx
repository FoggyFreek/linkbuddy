import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import BackgroundPicker from './BackgroundPicker.js'
import FontPicker from './FontPicker.js'
import ThemeVariantPicker from './ThemeVariantPicker.js'
import PanelSection from './PanelSection.js'
import type { DraftTheme, PageTheme } from '../../../types.js'

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
  themeVariant,
  onSetThemeVariant,
  font,
  onSetFont,
}: Readonly<{
  background: string
  schemeMode: PageTheme
  onSetBackground: (value: string) => void
  bannerUrl?: string | null
  showBanner: boolean
  onSetShowBanner: (value: boolean) => void
  theme: DraftTheme
  autoTheme: PageTheme
  onSetTheme: (value: DraftTheme) => void
  themeVariant: string | null
  onSetThemeVariant: (value: string) => void
  font: string
  onSetFont: (value: string) => void
}>) {
  return (
    <Stack spacing={2}>
      <PanelSection
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
            sx={{ mt: 1.5, width: '100%', maxWidth: 420, height: 140, objectFit: 'cover', borderRadius: 1, display: 'block' }}
          />
        )}
      </PanelSection>
      <PanelSection
        title="Theme"
        hint={`Determines light or dark theme colors for this page's card and content. Auto picks ${autoTheme} for this page.`}
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Colours for the {schemeMode} theme.
        </Typography>
        <ThemeVariantPicker value={themeVariant} mode={schemeMode} onChange={onSetThemeVariant} />
      </PanelSection>

      <PanelSection
        title="Background"
        hint="Artwork behind your page. Your content card stays on top of it, so text stays readable."
      >
        <BackgroundPicker value={background} mode={schemeMode} themeVariant={themeVariant} onChange={onSetBackground} />
      </PanelSection>

      <PanelSection
        title="Font"
        hint="The typeface for everything on this page. Each of your pages can use a different one."
      >
        <FontPicker value={font} mode={schemeMode} onChange={onSetFont} />
      </PanelSection>
    </Stack>
  )
}
