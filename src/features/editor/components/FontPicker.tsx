import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import CheckIcon from '@mui/icons-material/Check'
import ColorSchemeScope from '../../../components/ColorSchemeScope.js'
import { PAGE_FONT_OPTIONS, pageFontSx } from '../../../lib/pageFonts.js'
import type { PageTheme } from '../../../types.js'

type FontOption = (typeof PAGE_FONT_OPTIONS)[number]

// One swatch: a band name and a link label set in the face itself, rendered
// through the very `sx` the public page uses, inside a ColorSchemeScope forced to
// the *page's* scheme — so the sample reads exactly as the page will, whichever
// light/dark mode the editor happens to be in. `system` sets no variable, so the
// sample falls back to the theme stack: what an unset font looks like.
function Swatch({ option, mode, selected, onSelect }: { option: FontOption; mode: PageTheme; selected: boolean; onSelect: () => void }) {
  const fontSx = pageFontSx(option.key)
  return (
    <Stack spacing={0.5}>
      <ButtonBase
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Font: ${option.label}`}
        title={option.description}
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
          sx={[{ position: 'relative', px: 1.5, py: 1.5, textAlign: 'center' }, ...(fontSx ? [fontSx] : [])]}
        >
          <Typography data-sample variant="h4" noWrap>Aa</Typography>
          <Typography variant="caption" component="p" noWrap sx={{ opacity: 0.8 }}>
            Listen now
          </Typography>
          {selected && (
            <CheckIcon
              fontSize="small"
              sx={{
                position: 'absolute', bottom: 4, right: 4, borderRadius: '50%',
                bgcolor: 'background.paper', color: 'text.primary', p: '2px',
              }}
            />
          )}
        </ColorSchemeScope>
      </ButtonBase>
      <Typography variant="caption" align="center" color={selected ? 'text.primary' : 'text.secondary'}>
        {option.label}
      </Typography>
    </Stack>
  )
}

// The Appearance tab's typeface chooser: one swatch per key in PAGE_FONT_OPTIONS
// (`system` plus the self-hosted faces in src/lib/pageFonts.ts). Adding a font is
// a one-place change there — the grid auto-fills and wraps. The chosen key is
// stored on the layout, so it autosaves and publishes with everything else.
export default function FontPicker({ value, mode, onChange }: { value: string; mode: PageTheme; onChange: (value: string) => void }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}>
      {PAGE_FONT_OPTIONS.map((option) => (
        <Swatch
          key={option.key}
          option={option}
          mode={mode}
          selected={option.key === value}
          onSelect={() => onChange(option.key)}
        />
      ))}
    </Box>
  )
}
