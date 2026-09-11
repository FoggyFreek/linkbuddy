import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import ColorSchemeScope from '../../../components/ColorSchemeScope.js'
import { PAGE_THEME_OPTIONS, pageThemeForScheme, themeVariantSx } from '../../../lib/pageThemes.js'
import type { PageTheme } from '../../../types.js'

// One swatch: a miniature of the page in that palette — the canvas with a card
// and two lines of text on it — painted by the very `sx` the public page uses,
// inside a ColorSchemeScope forced to the *page's* scheme. Without that scope a
// swatch would inherit the editor's own light/dark choice and could disagree
// with the page it previews.
function VariantSwatch({ option, mode, selected, onSelect }: Readonly<{ option: { key: string; label: string }; mode: PageTheme; selected: boolean; onSelect: () => void }>) {
  return (
    <Stack spacing={0.5} sx={{ width: 92 }}>
      <ButtonBase
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Theme colours: ${option.label}`}
        sx={(theme) => ({
          display: 'block', width: '100%', overflow: 'hidden',
          borderRadius: `${theme.shape.item}px`,
          outline: '2px solid',
          outlineColor: selected ? theme.vars!.palette.text.primary : theme.vars!.palette.divider,
          outlineOffset: selected ? 2 : 0,
          '&:hover': { outlineColor: theme.vars!.palette.text.primary },
        })}
      >
        <ColorSchemeScope
          mode={mode}
          data-theme-variant={option.key}
          sx={[
            { aspectRatio: '3 / 2', width: '100%', p: 1, display: 'flex', alignItems: 'center' },
            themeVariantSx(option.key) || {},
          ]}
        >
          <Box
            data-card
            sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: 1, p: 0.75, display: 'grid', gap: 0.5 }}
          >
            <Box sx={{ height: 5, width: '75%', borderRadius: 1, bgcolor: 'text.primary' }} />
            <Box sx={{ height: 5, width: '50%', borderRadius: 1, bgcolor: 'text.secondary' }} />
          </Box>
        </ColorSchemeScope>
      </ButtonBase>
      <Typography variant="caption" align="center" color={selected ? 'text.primary' : 'text.secondary'}>
        {option.label}
      </Typography>
    </Stack>
  )
}

// The palette chooser inside the Theme section: the three variants of the colour
// scheme the page will render in (`mode` — the explicit light/dark opt-in, or the
// auto fallback). One key is stored per page, so a variant of the *other* scheme
// shows as that scheme's default here, exactly as the public page resolves it.
export default function ThemeVariantPicker({ value, mode, onChange }: Readonly<{ value: string | null; mode: PageTheme; onChange: (value: string) => void }>) {
  const selected = pageThemeForScheme(value, mode)
  return (
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
      {PAGE_THEME_OPTIONS[mode].map((option) => (
        <VariantSwatch
          key={option.key}
          option={option}
          mode={mode}
          selected={option.key === selected}
          onSelect={() => onChange(option.key)}
        />
      ))}
    </Stack>
  )
}
