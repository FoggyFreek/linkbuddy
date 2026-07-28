import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import CheckIcon from '@mui/icons-material/Check'
import ColorSchemeScope from '../../../components/ColorSchemeScope.jsx'
import { PAGE_BACKGROUND_OPTIONS, pageBackgroundSx } from '../../../lib/pageBackgrounds.js'

// One swatch: the artwork itself, painted by the very `sx` the public page uses,
// inside a ColorSchemeScope forced to the *page's* scheme. Without that scope the
// swatch would show whichever colourway matches the editor's own light/dark
// choice, and could disagree with the page it's previewing. `none` gets no
// background image, so the scope's plain `surface.canvas` shows through — exactly
// what an unset background looks like.
function Swatch({ option, mode, selected, onSelect }) {
  return (
    <Stack spacing={0.5}>
      <ButtonBase
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Background: ${option.label}`}
        title={option.description}
        sx={(theme) => ({
          display: 'block', width: '100%', overflow: 'hidden',
          borderRadius: `${theme.shape.item}px`,
          outline: '2px solid',
          outlineColor: selected ? theme.vars.palette.text.primary : theme.vars.palette.divider,
          outlineOffset: selected ? 2 : 0,
          '&:hover': { outlineColor: theme.vars.palette.text.primary },
        })}
      >
        <ColorSchemeScope
          mode={mode}
          sx={[
            { position: 'relative', aspectRatio: '3 / 4', width: '100%' },
            pageBackgroundSx(option.key),
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
      <Typography variant="caption" align="center" color={selected ? 'text.primary' : 'text.secondary'}>
        {option.label}
      </Typography>
    </Stack>
  )
}

// The Appearance tab's background chooser: one swatch per key in
// PAGE_BACKGROUND_OPTIONS (`none` plus the hand-drawn scenes in
// src/pageBackgrounds.js). Adding a background is a one-place change there — the
// grid auto-fills and wraps, so any number of them lays out without touching
// this component. The chosen key is stored on the layout, so it autosaves and
// publishes with everything else.
export default function BackgroundPicker({ value, mode, onChange }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}>
      {PAGE_BACKGROUND_OPTIONS.map((option) => (
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
