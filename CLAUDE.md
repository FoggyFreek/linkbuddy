# CLAUDE.md

Orientation for working in this repo. `README.md` has the product/architecture
story; this file is the short map plus the rules that aren't obvious from the
code. Most modules carry a header comment explaining their own contract — read
that before changing one.

## What this is

A standalone GigBuddy "link page" app: React 19 + Vite SPA (`src/`) over an
Express 5 + Postgres API (`server/`). No accounts and no router: GigBuddy is the
identity provider (HMAC handoff token → editor session), and routing is
path-based — `/edit` (editor), `/privacy`, `/` (server root), everything else is
a band or release slug rendered by `PublicPage`.

## Commands

- `npm run dev` — API (`:3010`) + Vite (`:5175`, proxies `/api`).
- `npm run build` — client bundle to `dist/`, served by `server/index.js`.
- `npm run migrate` — apply `server/migrations/*.sql` (run on deploy).
- `npm test` — Node/unit tests (Vitest, `test/**/*.test.js`): backend + pure logic.
- `npm run test:browser` — real-browser component tests (Vitest browser mode +
  Playwright, `test/browser/**/*.test.jsx`).

## Map

**Server** — `app.js` (all routes: public page + view/click beacons, and the
session-authenticated `/api/editor/*`), `pagesRepo.js`/`statsRepo.js` (SQL,
executor-first), `layout.js` (validate + normalize submitted layouts),
`resolve.js` (stored layout × content snapshot → public payload),
`gigbuddy.js` (content export pull), `tokens.js` (HMAC handoff/session),
`classify.js` (device/source/country, no IPs), `unfurl.js` + `safeFetch.js`
(SSRF-hardened link enrichment), `entitlements.js` (plan gating).

**Client** — `PublicPage.jsx` and `Editor.jsx` are the two roots. `Editor` keeps
its state in `src/hooks/` (`useEditorSession` = handoff/session/page list,
`useLayoutEditor` = draft layout + debounced autosave) and its UI in
`src/editor/` (tabs: build, appearance, preview, stats). `WidgetStack.jsx`
renders the resolved page for **both** the public page and the editor preview —
keep it presentational so the two can't diverge. `widgets/widgetModel.js` is the
pure client vocabulary for creating/labelling widgets.

**`shared/`** — allow-lists that the server validates against and the client
renders from: `linkIcons.js`, `platforms.js`, `pageBackgrounds.js`. When you add
a background, icon or platform, edit the `shared/` list first; both sides import
it, so they can't drift. The artwork/component maps live client-side
(`src/icons.jsx`, `src/pageBackgrounds.js`).

## Invariants

- **Privacy (don't break).** Third-party embeds never load on page view:
  visitors get a click-to-play facade, and the iframe mounts only after
  interaction, inside a closable overlay that unmounts it on close
  (`src/embeds.jsx`, `server/embeds.js`). The public page sets no cookies and
  stores nothing on the device. See `PRIVACY.md`.
- **Client input is untrusted.** `server/layout.js` whitelists field-by-field:
  unknown widget types rejected, unknown fields dropped, strings capped, URLs
  http(s) only. Iframe sources are recomputed server-side from stored URLs —
  clients never dictate them.
- **Slug namespaces.** Main page `/<mainSlug>`, releases `/<mainSlug>/<tail>`;
  release creation is restricted to the caller's own prefix.
- **Resolution is forgiving.** Widgets pointing at vanished content (deleted
  song, archived product) are dropped silently — a public page must never break
  because GigBuddy content moved on.

## Front end: MUI component-first, no stylesheet

Everything is **MUI v9** components styled with the **`sx` prop** and the theme.
There is **no CSS file** — do not add one.

- `src/theme.js` is the single source of truth: `cssVariables` with
  `colorSchemeSelector: 'data-theme'`, both colour schemes, `responsiveFontSizes`,
  and component defaults. Custom tokens `palette.surface.{s2,s3,border,field}`
  (`sx={{ bgcolor: 'surface.s2' }}`) and `palette.chart.c1…c8`.
- **Charts** (`@mui/x-charts`, community only) live in the stats tab, which
  `Editor.jsx` lazy-loads so the public-page bundle doesn't carry the library.
  Series colours come from `palette.chart.*` as `var(--mui-palette-chart-c1)` so
  they follow the colour scheme; the slot *order* is colour-blind-validated, so
  assign slots by category identity and never by rank. x-charts class names are
  `MuiBarChart-{element,label}` / `MuiPieChart-{arc,arcLabel}` — the styled-slot
  names (`MuiBarLabel-root`) are theme keys, not DOM classes.
- Per-scheme styles use `theme.applyStyles('dark', { … })`, never `palette.mode`,
  and never a hand-written `[data-theme='dark'] &` selector: MUI's own selector
  matches on *any* dark ancestor, so inside a `ColorSchemeScope` the scope
  overrides `applyStyles` with a static test against its own mode. That's what
  keeps a light page (light logo, light background art) light inside a dark
  editor or a visitor whose `<html>` is on dark.
- **Two independent schemes**, both owned by MUI, no manual `data-theme`
  bookkeeping: the *editor* scheme on `<html>` (`useColorScheme` /
  `ColorModeToggle`; guard `mode === undefined` on first render, and keep the
  inline anti-flash script in `index.html` in sync with the theme's keys), and
  the *page* scheme (an Appearance-tab light/dark toggle stored on the layout,
  `layout.theme`; `null`/"auto" falls back to dark for release pages, light for
  the main page — see `normalizeTheme` in `server/resolve.js`) inside
  `ColorSchemeScope.jsx`, which the public page and the editor preview both
  wrap their content in. Changing one never affects the other.
- **Portals must opt in:** Menu/Popover/Select/Tooltip/Dialog inside a scope
  escape it unless you spread `useScopedPortalProps()` (see `ShareButton`).
- **`Stack` only accepts `direction`, `spacing`, `useFlexGap`, `divider`** — put
  `justifyContent`/`alignItems`/`flexWrap` in `sx` or they leak to the DOM.
- Clickable cards are `CardActionArea component="a"`; collapsibles `Accordion`;
  pills `Chip`. The release layout uses raw `'@container (min-width:840px)'` in
  `sx` on a `containerType: 'inline-size'` parent.

## Testing notes

- Browser tests render **real** components (e.g. `PublicPage` with `api.js`
  mocked) and assert MUI structure + computed styles — query `.MuiCard-root`,
  `.MuiTypography-h1`, not CSS classes.
- If you touch theme scoping, keep `colorSchemeScope.test.jsx` (scope
  independence, two disagreeing scopes, portal inheritance) and
  `nestedTheme.test.jsx` (the MUI behaviour it rests on) green.
- `vitest.browser.config.js` uses a pre-installed Chromium at
  `/opt/pw-browsers/chromium-1194/…` when that path exists, and otherwise lets
  Playwright resolve its own browser — so a local `playwright install` is fine
  on a dev machine, but don't run it in the sandbox.
