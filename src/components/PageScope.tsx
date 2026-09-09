import ColorSchemeScope from './ColorSchemeScope.js'
import { pageBackgroundSx } from '../lib/pageBackgrounds.js'
import { pageFontSx } from '../lib/pageFonts.js'
import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ResolvedPage } from '../types.js'

// A resolved page turned into its colour scheme, background artwork and font
// variable; `bleed` (public routes only) paints the artwork from `sm` up.
export default function PageScope({ page, sx, bleed = false, children }: Readonly<{ page: ResolvedPage; sx?: SxProps<Theme>; bleed?: boolean; children: ReactNode }>) {
  const ownSx = Array.isArray(sx) ? sx : sx ? [sx] : []
  const background = pageBackgroundSx(page.background)
  const scopedBackground = background && bleed
    ? (theme: Theme) => ({ [theme.breakpoints.up('sm')]: background(theme) })
    : background
  return (
    <ColorSchemeScope
      mode={page.theme === 'dark' ? 'dark' : 'light'}
      sx={[...ownSx, scopedBackground, pageFontSx(page.font)]}
    >
      {children}
    </ColorSchemeScope>
  )
}
