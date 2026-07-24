import { createContext, useContext, useState } from 'react'
import Box from '@mui/material/Box'

// Portal container for a colour-scheme scope. MUI surfaces that portal to
// `document.body` (Menu, Popover, Select, Tooltip, Dialog…) would otherwise
// escape the scope and render in the document's own scheme. A descendant reads
// this and passes it as the portal `container`, so the portal mounts *inside*
// the scope and inherits its scheme. `null` (no surrounding scope) means the
// MUI default — `document.body`, i.e. the application/editor scheme.
const PortalContainerContext = createContext(null)

export function usePortalContainer() {
  return useContext(PortalContainerContext)
}

// Scopes a MUI colour scheme (`mode`: 'light' | 'dark') to a subtree, using the
// theme's colour-scheme selector. The theme emits its palette variables under
// `[data-theme="light"|"dark"]`, so setting that attribute here makes every MUI
// component and every `theme.vars` / palette-token `sx` reference *inside*
// resolve to `mode` — regardless of the document's own scheme. The scope paints
// its own surface (`background.default` / `text.primary`) and declares the
// native `color-scheme`, so it is fully self-contained: it looks the same
// whether it's the whole public page or a framed preview nested in the editor.
//
// This is the single mechanism behind both the public page and the editor
// preview, so the two can never diverge, and it replaces the previous imperative
// `document.documentElement.dataset.theme` juggling — the editor's own scheme
// (useColorScheme) and a page's appearance (band.theme) no longer touch the same
// attribute and can't interfere with each other.
export default function ColorSchemeScope({ mode, sx, children, ...props }) {
  const [node, setNode] = useState(null)
  return (
    <Box
      ref={setNode}
      data-theme={mode}
      sx={[
        { colorScheme: mode, bgcolor: 'background.default', color: 'text.primary' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      <PortalContainerContext.Provider value={node}>
        {children}
      </PortalContainerContext.Provider>
    </Box>
  )
}
