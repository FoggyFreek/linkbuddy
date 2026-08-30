import Box from '@mui/material/Box'
import type { Theme } from '@mui/material/styles'
import type { Band } from '../types.js'

// True when the band uploaded artwork for either scheme — callers use it to
// decide whether their title slot renders a logo or the name in type.
export function hasBandLogo(band: Band | null | undefined) {
  return !!(band && (band.logoUrl || band.logoDarkUrl))
}

// The band's logo as a scheme-aware image pair: `logoUrl` on a light surface,
// `logoDarkUrl` on a dark one, either standing in for the other when only one
// was uploaded. Both render and toggle via `theme.applyStyles('dark', …)`,
// which resolves against the enclosing ColorSchemeScope — so a light page keeps
// its light logo inside a dark editor, while unscoped editor chrome follows the
// editor's own scheme. `display: none` also drops the hidden copy from the
// accessibility tree, leaving the heading around it one accessible name.
//
// Size: by default the logo runs at its natural size under the `maxHeight` cap.
// Giving a `width` scales it down instead — the height follows from the image's
// own ratio, so the cap steps aside rather than clamping height against a now
// definite width and squashing the artwork.
export default function BandLogo({ band, width = 'auto', maxHeight = 83 }: Readonly<{ band: Band; width?: number | string; maxHeight?: number }>) {
  const onLight = band.logoUrl || band.logoDarkUrl
  const onDark = band.logoDarkUrl || band.logoUrl || ''
  if (!onLight) return null

  const alt = band.name || 'Band logo'
  const img = {
    display: 'inline-block',
    maxWidth: '100%',
    width,
    height: 'auto',
    objectFit: 'contain',
    ...(width === 'auto' && { maxHeight }),
  } as const
  return (
    <>
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
    </>
  )
}
