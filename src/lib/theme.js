import { createTheme, responsiveFontSizes } from '@mui/material/styles'

// The single source of truth for the app's look. Everything the stylesheet and
// components need — colours, surfaces, the type scale — comes from here, so the
// design responds to MUI's light/dark colour schemes rather than a hand-rolled
// set of CSS variables.
//
// `colorSchemeSelector: "[data-theme='%s']"` makes MUI emit its palette
// variables under `:root, [data-theme="light"]` (the default) and
// `[data-theme="dark"]` — `%s` is substituted with each scheme name. (MUI also
// accepts the shorthand `'data-theme'`, which it expands to the same selector;
// the explicit `%s` form is spelled out here to match MUI's documented API.) Two
// independent things key off that one selector, and MUI owns both:
//   - the editor's own light/dark/system choice, which `useColorScheme` writes
//     onto <html data-theme> for the whole application;
//   - a page's chosen scheme, which `ColorSchemeScope` sets on a wrapping
//     element so its subtree (the public page, or a preview nested in the
//     editor) resolves to that scheme, overriding the document's.
// Because the variables cascade, a scoped subtree simply re-resolves them — no
// manual attribute juggling or per-container text-colour restatement is needed.

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
//
// `surface.canvas` is the *page* backdrop — what `ColorSchemeScope` paints
// behind the public page and its editor preview. It sits two tone steps (−8 per
// channel each) below `background.default`, the application/editor backdrop, so
// the page's content card reads as a lifted surface against it.
// Categorical chart slots (`palette.chart.c1…c8`, emitted as
// `--mui-palette-chart-c*`). The two columns are the same eight hues stepped for
// their own surface — not an automatic flip — and the *order* is the
// colour-blind-safety mechanism: neighbouring slots are the pairs a stacked bar
// or a pie puts side by side, and this order clears the adjacent-pair gates
// (CVD ΔE ≥ 8, normal-vision ΔE ≥ 15) against the card surfaces of both schemes.
// Assign slots by category identity, never by rank, so a quiet day can't repaint
// the series. Several slots sit under 3:1 against their surface, so every chart
// using them ships readable relief: a legend, value labels, or the exact-count
// table beside it.
const chartLight = {
  c1: '#2a78d6', c2: '#eb6834', c3: '#1baf7a', c4: '#eda100',
  c5: '#e87ba4', c6: '#008300', c7: '#4a3aa7', c8: '#e34948',
}

const chartDark = {
  c1: '#3987e5', c2: '#d95926', c3: '#199e70', c4: '#c98500',
  c5: '#d55181', c6: '#008300', c7: '#9085e9', c8: '#e66767',
}

const lightPalette = {
  mode: 'light',
  background: { default: '#eceef2', paper: '#ffffff' },
  text: { primary: '#17181c', secondary: '#5c6066' },
  primary: { main: '#17181c', contrastText: '#ffffff' },
  success: { main: '#3ec93e', contrastText: '#ffffff' },
  divider: '#d5d8de',
  surface: { s2: '#f0f1f4', s3: '#e4e6ea', border: '#ecedf1', field: '#f7f8fa', canvas: '#dcdee2' },
  chart: chartLight,
}

const darkPalette = {
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
  // Semantic corner radii beyond the base card radius. `borderRadius` is the
  // card/panel default MUI applies to surfaces; `pill` fully rounds add-buttons,
  // range toggles and stat bars; `preview` frames the editor's public-page
  // preview; `item` rounds the smaller nested rows (a widget in the section
  // editor). Reference them as `theme.shape.*` — in `sx`, string-suffix with
  // `px` (e.g. borderRadius: `${theme.shape.preview}px`), since the numeric
  // `borderRadius` shorthand multiplies by the base radius.
  shape: { borderRadius: 18, pill: 999, preview: 24, item: 10 },
  typography,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
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
