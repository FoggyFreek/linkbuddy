import { useColorScheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'

// A light → dark → system cycle for the editor chrome, driven by MUI's
// `useColorScheme`. Setting the mode updates the `data-theme` attribute (and the
// stored preference) that the whole app's colour-scheme variables key off, so
// the operator can preview their tools in either scheme. The public band page is
// unaffected — it always forces the band's own chosen theme.
type ColorMode = 'light' | 'dark' | 'system'
const NEXT: Record<ColorMode, ColorMode> = { light: 'dark', dark: 'system', system: 'light' }
const ICON = { light: LightModeIcon, dark: DarkModeIcon, system: SettingsBrightnessIcon }
const LABEL = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' }

export default function ColorModeToggle() {
  const { mode, setMode } = useColorScheme()

  // `mode` is undefined until the provider has mounted on the client; render a
  // stable placeholder so the button doesn't jump.
  if (!mode) {
    return (
      <IconButton aria-hidden disabled size="small">
        <SettingsBrightnessIcon fontSize="small" />
      </IconButton>
    )
  }

  const currentMode = mode as ColorMode
  const Icon = ICON[currentMode]
  return (
    <Tooltip title={`${LABEL[currentMode]} (click to change)`}>
      <IconButton
        onClick={() => setMode(NEXT[currentMode])}
        size="small"
        aria-label={`Colour theme: ${LABEL[currentMode]}. Click to change.`}
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}
