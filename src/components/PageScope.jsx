import ColorSchemeScope from './ColorSchemeScope.jsx'
import { pageBackgroundSx } from '../lib/pageBackgrounds.js'

// A resolved page payload turned into its colour scheme and background artwork:
// the two things every rendering of a page shares, whether it's a band page, a
// release page or the editor's framed preview. `sx` is the caller's own layout,
// applied before the background so the background always paints on the scope
// element itself (what the visitor sees behind the content).
export default function PageScope({ page, sx, children }) {
  return (
    <ColorSchemeScope
      mode={page.theme === 'dark' ? 'dark' : 'light'}
      sx={[...(Array.isArray(sx) ? sx : [sx]), pageBackgroundSx(page.background)]}
    >
      {children}
    </ColorSchemeScope>
  )
}
