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
  variables under `:root, [data-theme="light"]` and `[data-theme="dark"]`. Two
  independent concerns key off that one selector, and MUI owns both — there is no
  manual `data-theme` bookkeeping:
  - **Editor scheme** = the application scheme. The editor's live
    light/dark/system switch is `useColorScheme` (`ColorModeToggle`); MUI writes
    the result to `<html data-theme>` for the whole app. Guard
    `mode === undefined` on first render.
  - **Page scheme** = page content (`band.theme`). Both the **public page** and
    the **editor preview** wrap their content in **`ColorSchemeScope`** (`src/
    ColorSchemeScope.jsx`), which sets `data-theme` on a wrapping `Box` and paints
    its own `background.default` / `text.primary` / `color-scheme`. MUI's vars
    cascade, so everything inside re-resolves to that scheme regardless of the
    document's. The scope is the *single* implementation shared by preview and
    production, so they can't diverge; because it sets `color` itself, no global
    `[data-theme]` text-colour rule is needed (it was removed).
  - Because the two schemes live in different places (`<html>` vs. a scoped
    `Box`), changing the editor scheme never affects a preview and vice-versa.
  - **Portals in a scope:** MUI surfaces that portal to `document.body` (Menu,
    Popover, Select, Tooltip, Dialog) would escape the scope. `ColorSchemeScope`
    exposes its node via `usePortalContainer()`; a descendant passes it as the
    portal `container` so the portal mounts inside the scope and inherits its
    scheme (see `ShareButton`'s menu). Outside a scope the hook returns `null` →
    MUI's default (`document.body`, the app scheme).
  - `index.html` contains an inline colour-scheme init script (the CSR
    equivalent of `<InitColorSchemeScript>`, which is SSR-only / returns null on
    the client). It restores the stored **editor** mode (`mui-mode`) onto
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
- `test/browser/colorSchemeScope.test.jsx` guards `ColorSchemeScope`: scheme
  independence from the document, two disagreeing scopes at once, and portal
  inheritance. `test/browser/nestedTheme.test.jsx` guards the lower-level MUI
  behaviour it relies on (forced scheme on a nested container). Keep both green
  if you touch theme scoping.
- Playwright launches the pre-installed Chromium via `executablePath`
  (`/opt/pw-browsers/chromium-1194/…`) because the bundled browser revision
  differs — see `vitest.browser.config.js`. Do not run `playwright install`.

## Privacy contract (don't break)

Third-party embeds (Spotify/YouTube/SoundCloud iframes) must **never** load on
page load — visitors see a click-to-play facade and the player mounts only after
interaction (`embeds.jsx`, `EmbedWidget`). The public page sets no cookies and
stores nothing on the device. See `PRIVACY.md`.
