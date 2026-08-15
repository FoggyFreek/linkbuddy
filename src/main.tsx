import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './app/App.js'
import theme from './lib/theme.js'

// One theme for the whole app. ThemeProvider owns the `data-theme` attribute and
// the light/dark colour schemes; CssBaseline paints the page background/text from
// the active scheme and enables the browser's native colour-scheme so form
// controls and scrollbars follow suit. `defaultMode="light"` keeps the app's
// original default, while the editor exposes a live light/dark/system switch.
const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider theme={theme} defaultMode="light" disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
