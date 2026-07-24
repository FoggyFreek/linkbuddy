# CLAUDE.md

Guidance for working in this repo. See `README.md` for the product/architecture
overview; this file focuses on conventions that aren't obvious from the code.

## What this is

A standalone GigBuddy "link page" app: a React (Vite) SPA front end plus an
Express + Postgres API (`server/`). Path-based routing, no router:
`/edit` (operator editor), `/privacy`, `/` (server root), everything else is a
band/release slug rendered by `PublicPage`.

## Commands

- `npm run dev` — API (`:3010`) + Vite dev server (`:5174`) together.
- `npm run build` — production client bundle to `dist/` (served by `server/index.js`).
- `npm test` — Node/unit tests (Vitest, `test/**/*.test.js`). Backend + pure logic.
- `npm run test:browser` — real-browser component tests (Vitest browser mode +
  Playwright, `test/browser/**/*.test.jsx`). Runs in the pre-installed Chromium.

## Front end: MUI component-first, no stylesheet

The UI is built entirely from **Material UI (MUI v9)** components styled with the
**`sx` prop** and the theme. There is **no CSS file** — do not add one. All
colour, type, spacing, and per-scheme styling flow from the theme.

- **Theme:** `src/theme.js` is the single source of truth. It uses
  `createTheme({ cssVariables: { colorSchemeSelector: 'data-theme' }, colorSchemes: { light, dark }, … })`,
  a full `typography` scale wrapped in `responsiveFontSizes`, and component
  defaults (`MuiCard`, `MuiButton`, `MuiChip`) under `components`.
- **Colour schemes / dark mode:** driven by MUI colour schemes, not
  `palette.mode`. `colorSchemeSelector: 'data-theme'` makes MUI emit its
  variables under `:root, [data-theme="light"]` and `[data-theme="dark"]`.
  - The **public page** forces the band's chosen scheme by setting
    `document.documentElement.dataset.theme` (`PublicPage`), so `CssBaseline`
    paints the body and all MUI vars resolve to that scheme.
  - The **editor preview** forces a scheme on a *nested* container (a `Box` with
    `data-theme=…`). MUI components read `theme.vars`, so their surfaces
    recompute automatically; a theme global rule
    (`components.MuiCssBaseline.styleOverrides['[data-theme]'] = { color: 'var(--mui-palette-text-primary)' }`)
    restates the **inherited text colour** so plain Typography text follows the
    forced scheme too. Keep that rule — without it, nested dark previews get
    dark text.
  - The editor offers a live light/dark/system switch via `useColorScheme`
    (`ColorModeToggle`); guard `mode === undefined` on first render.
  - `index.html` contains an inline colour-scheme init script (the CSR
    equivalent of `<InitColorSchemeScript>`, which is SSR-only / returns null on
    the client). It restores the stored mode (`mui-mode`) onto
    `<html data-theme>` before the bundle loads, preventing a flash. Keep its
    keys/attribute in sync with the theme.
- **Per-scheme styles in `sx`:** use `theme.applyStyles('dark', { … })` (the MUI
  recommendation over reading `palette.mode`). Example: the dark card border in
  `theme.js` and `WidgetStack`.
- **Custom palette tokens:** `palette.surface.{s2,s3,border,field}` carry the
  pill/scroll/hairline tones; reference them as `sx={{ bgcolor: 'surface.s2' }}`
  / `theme.vars.palette.surface.*` (MUI emits `--mui-palette-surface-*`).

### Component conventions

- Clickable cards use `CardActionArea component="a"` (song, link, merch, embed
  fallback). Collapsibles use `Accordion` (gigs). Pills are `Chip`, avatars
  `Avatar`, form fields `TextField`/`Select`, tables `Table`.
- **`Stack` only accepts `direction`, `spacing`, `useFlexGap`, `divider`.** Put
  `justifyContent` / `alignItems` / `flexWrap` in `sx`, or they leak to the DOM
  (React "unknown prop" warning).
- The container-query release layout lives in `sx` via raw
  `'@container (min-width:840px)': { … }` on a `containerType: 'inline-size'`
  parent — retained from the original design.
- `WidgetStack` renders both the public page and the editor preview, so preview
  can't drift from what visitors see. Keep it presentational.

## Testing notes

- Browser tests render **real** components (e.g. `PublicPage` with a mocked
  `api.js`) and assert MUI structure + computed styles — query `.MuiCard-root`,
  `.MuiTypography-h1`, etc., not old CSS classes.
- `test/browser/nestedTheme.test.jsx` guards the forced-scheme-on-a-nested-
  container case (the editor preview): if you change how theme forcing works,
  keep it green.
- Playwright launches the pre-installed Chromium via `executablePath`
  (`/opt/pw-browsers/chromium-1194/…`) because the bundled browser revision
  differs — see `vitest.browser.config.js`. Do not run `playwright install`.

## Privacy contract (don't break)

Third-party embeds (Spotify/YouTube/SoundCloud iframes) must **never** load on
page load — visitors see a click-to-play facade and the player mounts only after
interaction (`embeds.jsx`, `EmbedWidget`). The public page sets no cookies and
stores nothing on the device. See `PRIVACY.md`.
