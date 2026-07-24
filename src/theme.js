import { createTheme, responsiveFontSizes } from '@mui/material/styles'

// The single source of truth for the app's look. Everything the stylesheet and
// components need — colours, surfaces, the type scale — comes from here, so the
// design responds to MUI's light/dark colour schemes rather than a hand-rolled
// set of CSS variables.
//
// `colorSchemeSelector: 'data-theme'` makes MUI emit its palette variables under
// `:root, [data-theme="light"]` (the default) and `[data-theme="dark"]`. That is
// the exact attribute the public page already toggles for a band's chosen theme
// and the editor preview sets on its frame, so a single mechanism now drives
// both the theme variables and MUI's own components.

// Shared type scale (px → rem against the 16px root). The variants map onto the
// roles the design already used: h1 the band name, h2 a release title, h3 a
// section heading, body1 a card label, and so on. Sizes match the previous
// stylesheet so the visual rhythm is preserved while MUI now owns typography.
const typography = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  htmlFontSize: 16,
  fontWeightMedium: 500,
  h1: { fontSize: '2.125rem', fontWeight: 600, lineHeight: 1.15 }, // band name (34px)
  h2: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }, // release title (22px)
  h3: { fontSize: '1.1875rem', fontWeight: 700, lineHeight: 1.3 }, // section title (19px)
  h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 }, // merch title (18px)
  h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 },
  h6: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }, // stats block heading (15px)
  subtitle1: { fontSize: '1.1875rem', fontWeight: 400, lineHeight: 1.35 }, // band bio (19px)
  subtitle2: { fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.3 }, // release artist (18px)
  body1: { fontSize: '1.0625rem', fontWeight: 500, lineHeight: 1.4 }, // card / platform label (17px)
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.45 }, // 14px
  caption: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.4 }, // sublabels (13px)
  button: { textTransform: 'none', fontWeight: 600 },
}

// Named surfaces beyond MUI's own palette. `surface.*` carry the pill / scroll /
// hairline tones the cards rely on. Components reference them through the `sx`
// prop (e.g. bgcolor: 'surface.s2') and theme.vars.palette.surface.*, and MUI
// emits them as `--mui-palette-surface-*` variables per colour scheme.
const lightPalette = {
  mode: 'light',
  background: { default: '#eceef2', paper: '#ffffff' },
  text: { primary: '#17181c', secondary: '#5c6066' },
  primary: { main: '#17181c', contrastText: '#ffffff' },
  success: { main: '#3ec93e', contrastText: '#ffffff' },
  divider: '#d5d8de',
  surface: { s2: '#f0f1f4', s3: '#e4e6ea', border: '#ecedf1', field: '#f7f8fa' },
}

const darkPalette = {
  mode: 'dark',
  background: { default: '#26374d', paper: '#2f4257' },
  text: { primary: '#f2f5f9', secondary: '#9fb1c2' },
  primary: { main: '#f2f5f9', contrastText: '#26374d' },
  success: { main: '#3ec93e', contrastText: '#ffffff' },
  divider: 'rgba(255, 255, 255, 0.14)',
  surface: { s2: '#35485e', s3: '#3f5468', border: 'rgba(255, 255, 255, 0.05)', field: '#35485e' },
}

const baseTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-theme' },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  shape: { borderRadius: 18 },
  typography,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
        // Any element that forces a colour scheme on a subtree (the editor
        // preview, and the public page on <html>) restates the inherited text
        // colour from that scheme. CssBaseline sets `color` on <body> against the
        // root scheme, and it inherits as a fixed value — so plain inherited text
        // (Typography without an explicit colour) inside a nested [data-theme]
        // container would otherwise keep the root's colour. MUI components that
        // set their own colour are unaffected. This global rule keeps forcing
        // robust without every container having to remember to set `color`.
        '[data-theme]': { color: 'var(--mui-palette-text-primary)' },
      },
    },
    // The card surface the whole design is built on: rounded, a hairline-soft
    // drop shadow on light, and — where that shadow all but disappears — a
    // hairline outline plus a deeper shadow on dark. `applyStyles('dark', …)`
    // is the recommended way to express per-scheme styles (over palette.mode).
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgb(20 22 26 / 0.08)',
          ...theme.applyStyles('dark', {
            border: `1px solid ${theme.vars.palette.surface.border}`,
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.35)',
          }),
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    // Pills (extra song links) and chips (editor page switcher) share the
    // rounded look; keep their label casing as authored.
    MuiChip: {
      styleOverrides: {
        label: { textTransform: 'none' },
      },
    },
  },
})

// Fluidly scale the heading variants down on small screens (per the MUI
// responsive-typography helper) so the band name and titles never overflow a
// phone; body text keeps its fixed, legible size.
const theme = responsiveFontSizes(baseTheme, { variants: ['h1', 'h2', 'h3', 'h4'] })

export default theme
