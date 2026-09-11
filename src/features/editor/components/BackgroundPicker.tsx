import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import CheckIcon from '@mui/icons-material/Check'
import ColorSchemeScope from '../../../components/ColorSchemeScope.js'
import { PAGE_BACKGROUND_OPTIONS, backgroundBaseKey, pageBackgroundSx } from '../../../lib/pageBackgrounds.js'
import { themeVariantSx } from '../../../lib/pageThemes.js'
import type { BackgroundColourway } from '../../../lib/pageBackgrounds.js'
import type { PageTheme } from '../../../types.js'

type BackgroundOption = (typeof PAGE_BACKGROUND_OPTIONS)[number]

// One swatch: the artwork itself, painted by the very `sx` the public page uses,
// inside a ColorSchemeScope forced to the *page's* scheme. Without that scope the
// swatch would show whichever colourway matches the editor's own light/dark
// choice, and could disagree with the page it's previewing. The page's theme
// variant is applied in the same place, so `none` — which gets no background
// image, and shows the scope's plain `surface.canvas` — and the theme-coloured
// tile patterns preview in the palette the page is actually on.
//
// A colourway dot: the palette's colours as equal columns in a small circle,
// overlaid on the swatch it belongs to. It sits beside the swatch button rather
// than inside it, since a button may not contain another button.
function ColourwayDot({ colourway, mode, selected, onSelect }: Readonly<{ colourway: BackgroundColourway; mode: PageTheme; selected: boolean; onSelect: () => void }>) {
  return (
    <ButtonBase
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Colours: ${colourway.label}`}
      title={colourway.label}
      sx={(theme) => ({
        width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', display: 'flex',
        boxShadow: `0 0 0 ${selected ? 2 : 1}px ${selected ? theme.vars!.palette.text.primary : theme.vars!.palette.background.paper}`,
        '&:hover': { boxShadow: `0 0 0 2px ${theme.vars!.palette.text.primary}` },
      })}
    >
      {colourway.colors[mode].map((color) => (
        <Box key={color} sx={{ flex: 1, height: '100%', bgcolor: color }} />
      ))}
    </ButtonBase>
  )
}

function Swatch({ option, value, mode, themeVariant, selected, onSelect }: Readonly<{ option: BackgroundOption; value: string; mode: PageTheme; themeVariant: string | null; selected: boolean; onSelect: (key: string) => void }>) {
  // While the scene is chosen its swatch previews the chosen colourway, so the
  // dots change the artwork under them.
  const backgroundSx = pageBackgroundSx(selected ? value : option.key, themeVariant)
  const colourways = selected ? option.colourways : []
  return (
    <Stack spacing={0.5}>
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={() => onSelect(option.key)}
          aria-pressed={selected}
          aria-label={`Background: ${option.label}`}
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
            sx={[
              { position: 'relative', aspectRatio: '3 / 4', width: '100%' },
              themeVariantSx(themeVariant) || {},
              ...(backgroundSx ? [backgroundSx] : []),
            ]}
          >
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
        {colourways.length > 1 && (
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', left: 6, bottom: 6, zIndex: 1 }}>
            {colourways.map((colourway) => (
              <ColourwayDot
                key={colourway.key}
                colourway={colourway}
                mode={mode}
                selected={colourway.key === value}
                onSelect={() => onSelect(colourway.key)}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Typography variant="caption" align="center" color={selected ? 'text.primary' : 'text.secondary'}>
        {option.label}
      </Typography>
    </Stack>
  )
}

// The Appearance tab's background chooser: one swatch per key in
// PAGE_BACKGROUND_OPTIONS (`none` plus the hand-drawn scenes in
// src/lib/pageBackgrounds.ts). Adding a background is a one-place change there — the
// grid auto-fills and wraps, so any number of them lays out without touching
// this component. The chosen key is stored on the layout, so it autosaves and
// publishes with everything else.
export default function BackgroundPicker({ value, mode, themeVariant = null, onChange }: Readonly<{ value: string; mode: PageTheme; themeVariant?: string | null; onChange: (value: string) => void }>) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}>
      {PAGE_BACKGROUND_OPTIONS.map((option) => (
        <Swatch
          key={option.key}
          option={option}
          value={value}
          mode={mode}
          themeVariant={themeVariant}
          selected={option.key === backgroundBaseKey(value)}
          onSelect={onChange}
        />
      ))}
    </Box>
  )
}
