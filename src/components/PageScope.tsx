import ColorSchemeScope from './ColorSchemeScope.js'
import { pageBackgroundSx } from '../lib/pageBackgrounds.js'
import { pageFontSx } from '../lib/pageFonts.js'
import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ResolvedPage } from '../types.js'

// A resolved page payload turned into its colour scheme, background artwork and
// typeface: the things every rendering of a page shares, whether it's a band
// page, a release page or the editor's framed preview. `sx` is the caller's own
// layout, applied before the background so the background always paints on the
// scope element itself (what the visitor sees behind the content). The font is a
// CSS variable the theme's typography reads, so it reaches every piece of text
// inside the scope and nothing outside it.
export default function PageScope({ page, sx, children }: { page: ResolvedPage; sx?: SxProps<Theme>; children: ReactNode }) {
  const ownSx = Array.isArray(sx) ? sx : sx ? [sx] : []
  return (
    <ColorSchemeScope
      mode={page.theme === 'dark' ? 'dark' : 'light'}
      sx={[...ownSx, pageBackgroundSx(page.background), pageFontSx(page.font)]}
    >
      {children}
    </ColorSchemeScope>
  )
}
