import { createTheme, responsiveFontSizes, type PaletteOptions } from '@mui/material/styles'
import { PAGE_FONT_FACE_CSS } from './pageFonts.js'

const SYSTEM_FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const typography = {
  fontFamily: `var(--lb-page-font, ${SYSTEM_FONT_STACK})`,
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


const chartLight = {
  c1: '#2a78d6', c2: '#eb6834', c3: '#1baf7a', c4: '#eda100',
  c5: '#e87ba4', c6: '#008300', c7: '#4a3aa7', c8: '#e34948',
}

const chartDark = {
  c1: '#3987e5', c2: '#d95926', c3: '#199e70', c4: '#c98500',
  c5: '#d55181', c6: '#008300', c7: '#9085e9', c8: '#e66767',
}

const lightPalette: PaletteOptions = {
  mode: 'light',
  background: { default: '#eceef2', paper: '#ffffff' },
  text: { primary: '#17181c', secondary: '#5c6066' },
  primary: { main: '#17181c', contrastText: '#ffffff' },
  success: { main: '#3ec93e', contrastText: '#ffffff' },
  divider: '#d5d8de',
  surface: { s2: '#f0f1f4', s3: '#e4e6ea', border: '#ecedf1', field: '#f7f8fa', canvas: '#dcdee2' },
  chart: chartLight,
}

const darkPalette: PaletteOptions = {
  mode: 'dark',
  background: { default: '#26374d', paper: '#2f4257' },
  text: { primary: '#f2f5f9', secondary: '#9fb1c2' },
  primary: { main: '#f2f5f9', contrastText: '#26374d' },
  success: { main: '#3ec93e', contrastText: '#ffffff' },
  divider: 'rgba(255, 255, 255, 0.14)',
  surface: { s2: '#35485e', s3: '#3f5468', border: 'rgba(255, 255, 255, 0.05)', field: '#35485e', canvas: '#16273d' },
  chart: chartDark,
}

const baseTheme = createTheme({
  cssVariables: { colorSchemeSelector: "[data-theme='%s']" },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  shape: { borderRadius: 18, pill: 999, preview: 24, item: 10 },
  typography,
  components: {
    // The self-hosted faces a page may select, declared once for the whole app.
    // A browser fetches a .woff2 only when rendered text uses that family, so
    // this costs a little CSS and a page renders exactly the one font it picked.
    // These overrides are a CSS string, not style objects, because several
    // `@font-face` rules can't share one object key — see PAGE_FONT_FACE_CSS.
    MuiCssBaseline: {
      styleOverrides: `
${PAGE_FONT_FACE_CSS}
body{-webkit-font-smoothing:antialiased;}
`,
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
      // The editor's standard content card: the section editor and the stats
      // blocks use the same inset. (The public page's cards keep their own
      // bespoke paddings.)
      variants: [
        { props: { variant: 'panel' }, style: { padding: '14px 16px' } },
      ],
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
      },
      // Dashed, pill-shaped "add" affordance (add a widget of a type). A named
      // variant so the look lives in one place instead of repeating
      // borderRadius/borderStyle at each call site; it restates the outlined
      // button's border/hover/disabled states since a custom variant doesn't
      // inherit them.
      variants: [
        {
          props: { variant: 'pill' },
          style: ({ theme }) => ({
            borderRadius: theme.shape.pill,
            border: '1px dashed',
            borderColor: theme.vars.palette.divider,
            color: theme.vars.palette.text.primary,
            '&:hover': {
              border: '1px dashed',
              borderColor: theme.vars.palette.text.primary,
              backgroundColor: theme.vars.palette.action.hover,
            },
            '&.Mui-disabled': {
              border: '1px dashed',
              borderColor: theme.vars.palette.divider,
              color: theme.vars.palette.text.disabled,
            },
          }),
        },
      ],
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
