import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import { ThemeProvider, type SxProps, type Theme } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'
import type { CSSObject } from '@mui/system'
import type { PageTheme } from '../types.js'

// Portal container for a colour-scheme scope. MUI surfaces that portal to
// `document.body` (Menu, Popover, Select, Tooltip, Dialog…) would otherwise
// escape the scope and render in the document's own scheme. A descendant reads
// this and passes it as the portal `container`, so the portal mounts *inside*
// the scope and inherits its scheme. `null` (no surrounding scope) means the
// MUI default — `document.body`, i.e. the application/editor scheme.
const PortalContainerContext = createContext<HTMLElement | null>(null)

export function usePortalContainer() {
  return useContext(PortalContainerContext)
}

// Convenience for portal-based MUI surfaces (Menu, Popover, Select, Autocomplete,
// Tooltip, Dialog…) rendered inside a scope: spread the result onto the component
// so it portals into the scope instead of escaping to `document.body`. Returns
// `{ container }` inside a scope, or `{}` outside one (MUI's default container).
// Prefer this over reading `usePortalContainer()` at each call site so new scoped
// surfaces inherit the scheme without repeating the `container || undefined` dance.
export function useScopedPortalProps() {
  const container = useContext(PortalContainerContext)
  return container ? { container } : {}
}

// Scopes a MUI colour scheme (`mode`: 'light' | 'dark') to a subtree, using the
// theme's colour-scheme selector. The theme emits its palette variables under
// `[data-theme="light"|"dark"]`, so setting that attribute here makes every MUI
// component and every `theme.vars` / palette-token `sx` reference *inside*
// resolve to `mode` — regardless of the document's own scheme. The scope paints
// its own surface (`surface.canvas`, the page backdrop / `text.primary`) and declares the
// native `color-scheme`, so it is fully self-contained: it looks the same
// whether it's the whole public page or a framed preview nested in the editor.
//
// This is the single mechanism behind both the public page and the editor
// preview, so the two can never diverge, and it replaces the previous imperative
// `document.documentElement.dataset.theme` juggling — the editor's own scheme
// (useColorScheme) and a page's own scheme no longer touch the same attribute
// and can't interfere with each other.
//
// Palette *variables* scope themselves correctly (CSS custom properties inherit
// from the nearest element that redefines them), but conditional styles do not:
// `theme.applyStyles('dark', …)` compiles to `*:where([data-theme="dark"]) &`,
// which matches whenever *any* ancestor is dark — so an outer dark document (the
// editor's own scheme, or the anti-flash script in index.html restoring a
// visitor's stored mode) would win over an inner light scope and, say, hide the
// light logo in favour of the dark one. Inside a scope the scheme is known
// statically, so a nested ThemeProvider replaces `applyStyles` with a plain
// mode test — no selector, nothing for an ancestor to override. It wraps the
// scope's own Box too, so `sx` passed in here (the page background artwork) gets
// the same treatment.
function toSxArray(sx: SxProps<Theme> | undefined) {
  if (Array.isArray(sx)) return sx
  return sx ? [sx] : []
}

interface ColorSchemeScopeProps extends Omit<BoxProps, 'children'> {
  mode: PageTheme
  children: ReactNode
}

export default function ColorSchemeScope({ mode, sx, children, ...props }: ColorSchemeScopeProps) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  // A function theme keeps MUI's ThemeProvider on its plain (non-CSS-vars) path:
  // it just merges into the outer theme, leaving the root provider's colour-scheme
  // machinery — and `theme.vars`, which components read — untouched.
  const scopedTheme = useMemo(
    () => (outer: Theme): Theme => ({
      ...outer,
      applyStyles: (scheme: string, styles: CSSObject) => (scheme === mode ? styles : {}),
    }),
    [mode],
  )
  return (
    <ThemeProvider theme={scopedTheme}>
      <Box
        ref={setNode}
        data-theme={mode}
        sx={[
          { colorScheme: mode, bgcolor: 'surface.canvas', color: 'text.primary' },
          ...toSxArray(sx),
        ]}
        {...props}
      >
        <PortalContainerContext.Provider value={node}>
          {children}
        </PortalContainerContext.Provider>
      </Box>
    </ThemeProvider>
  )
}
