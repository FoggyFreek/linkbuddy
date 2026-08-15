import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Band } from '../../../types.js'
import type { Theme } from '@mui/material/styles'

// The title slot: the band's logo when set, otherwise the name in type. Both
// logos render and toggle via `theme.applyStyles('dark', …)`, which resolves
// against the enclosing ColorSchemeScope — so a light page keeps its light logo
// inside a dark editor. `display: none` also drops the hidden copy from the
// accessibility tree, leaving the heading one accessible name.
export default function BandTitle({ band }: { band: Band }) {
  const onLight = band.logoUrl || band.logoDarkUrl
  const onDark = band.logoDarkUrl || band.logoUrl || ''
  if (!onLight) return <Typography variant="h1" sx={{ mt: '14px', mb: '6px' }}>{band.name}</Typography>

  const alt = band.name || 'Band logo'
  const img = { display: 'inline-block', maxWidth: '100%', maxHeight: 83, width: 'auto', objectFit: 'contain' } as const
  return (
    <Box component="h1" sx={{ m: 0, mt: '14px', mb: '6px' }}>
      <Box
        component="img"
        src={onLight}
        alt={alt}
        sx={[img, ...(onLight === onDark ? [] : [(theme: Theme) => theme.applyStyles('dark', { display: 'none' })])]}
      />
      {onLight !== onDark && (
        <Box
          component="img"
          src={onDark}
          alt={alt}
          sx={[img, { display: 'none' }, (theme: Theme) => theme.applyStyles('dark', { display: 'inline-block' })]}
        />
      )}
    </Box>
  )
}
