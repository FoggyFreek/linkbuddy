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
a page slug, where the segment count picks the kind: `/<slug>` is a band's link
page (`BandPage`), `/<mainSlug>/<tail>` a release smart link (`ReleasePage`).

## Commands

- `npm run dev` — API (`:3010`) + Vite (`:5175`, proxies `/api`).
- `npm run build` — client bundle to `dist/`, served by `server/index.js`.
- `npm run migrate` — apply `server/migrations/*.sql` (run on deploy).
- `npm test` — Node/unit tests (Vitest, `test/**/*.test.js`): backend + pure logic.
- `npm run test:browser` — real-browser component tests (Vitest browser mode +
  Playwright, `test/browser/**/*.test.jsx`).

## Map

**Server** — `app.js` (all routes: public page + view/click beacons, and the
session-authenticated `/api/editor/*` plus the internal slug-sync route),
`namespaceService.js`/`namespacesRepo.js` (revisioned tenant namespace moves),
`pagesRepo.js`/`statsRepo.js` (SQL, executor-first), `layout.js` (validate +
normalize submitted layouts),
`resolve.js` (stored layout × content snapshot → public payload),
`gigbuddy.js` (content export pull), `tokens.js` (HMAC handoff/session),
`classify.js` (device/source/country, no IPs), `unfurl.js` + `safeFetch.js`
(SSRF-hardened link enrichment), `entitlements.js` (plan gating).

**Client** — feature-based, one direction only: `app/` → `features/` →
`components/` → `lib/`+`utils/`. Nothing in `components/`, `lib/` or `utils/`
may import a feature (`PreviewContent` is the one deliberate exception, below),
and features don't import each other.

```
src/main.jsx              Vite entry: ThemeProvider + CssBaseline + <App/>
src/app/App.jsx           path-based routing, no router
src/app/routes/           BandPage · ReleasePage · Editor · Privacy
src/components/           shared UI (below)
src/features/<name>/       components/ · hooks/ · utils/ — only what that feature owns
src/lib/                  api.js · theme.js · pageBackgrounds.js
src/utils/                pure helpers: format · socials · pathSlug · trimChars
```

**Visitor-facing rendering** — two page kinds, two routes, no shared branch.
`app/routes/BandPage.jsx` renders `features/public-links-card/` (`LinksCard` +
`BandHeader`/`BandTitle`/`BandBanner`) and `app/routes/ReleasePage.jsx` renders
`features/smart-link/` (`SmartLinkPage` + `ReleaseArt`/`ReleaseInfo`). Each owns
its own chrome end to end — share-button placement, the GigBuddy attribution,
the footer, viewport spacing — because the two designs are genuinely different:
the band page is a centered card its chrome pins to, the release page is
full-bleed with viewport-pinned chrome. **Resist adding a `page.release` branch
back**; if something differs by kind, it belongs in one route, not in a shared
component. What they *do* share is extracted: `usePublicPage` (fetch + view/click
beacons), `PageStatus` (loading/not-found/error), `PageScope` (payload → colour
scheme + background artwork), `PrivacyNote`.

Keep both shells presentational: data arrives resolved from `server/resolve.js`,
and `onLinkClick` is the only outbound side effect. `components/PreviewContent.jsx`
picks the same shell for the editor's Preview tab, minus the chrome; it lives in
`components/` — reaching *down* into two features — only because `features/editor`
may not import another feature. Don't copy that pattern elsewhere.

**`features/editor/`** — `components/` (tabs: build, appearance, preview, stats,
plus the widget forms `WidgetEditors` and the `NewReleaseForm` dialog), `hooks/`
(`useEditorSession` = handoff/session/page list, `useLayoutEditor` = draft
layout + debounced autosave, `useDragReorder` = widget drag/keyboard reordering,
owned by `LayoutBuilder` because a widget can be dragged between sections),
`utils/` (`editorUtils.js`, and `widgetModel.js`
= the pure vocabulary for creating/labelling widgets). Its root is the
`app/routes/Editor.jsx` route, which owns the session and composes the tabs.

**`src/components/`** — everything shared. `Section` renders a section's widgets
through the `WIDGETS` map in `widgets/index.js` (one renderer per file); widgets
live here rather than in a feature because `server/layout.js` allows any type on
either page kind. Alongside them: `SocialLinks`, `Thumb`, `CardLabel`,
`SectionTitle`, `PlayPill`, and the app-wide `ColorSchemeScope` (+
`useScopedPortalProps`), `ColorModeToggle`, `ShareButton`, `CenteredStatus`,
`icons.jsx`, `embeds.jsx`.

**`shared/`** — allow-lists that the server validates against and the client
renders from: `linkIcons.js`, `platforms.js`, `pageBackgrounds.js`. When you add
a background, icon or platform, edit the `shared/` list first; both sides import
it, so they can't drift. The artwork/component maps live client-side
(`components/icons.jsx`, `lib/pageBackgrounds.js`).

## Invariants

- **Privacy (don't break).** Third-party embeds never load on page view:
  visitors get a click-to-play facade, and the iframe mounts only after
  interaction, inside a closable overlay that unmounts it on close
  (`src/components/embeds.jsx`, `server/embeds.js`). The public page sets no cookies and
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

## General notes

- Keep comments to the minimum and concise. Only add them where relevant for
  understanding code; otherwise, let the code speak for itself.

## Front end: MUI component-first, no stylesheet

Everything is **MUI v9** components styled with the **`sx` prop** and the theme.
There is **no CSS file** — do not add one.

- `src/lib/theme.js` is the single source of truth: `cssVariables` with
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

- **Develop test-first.** For every new behavior, bug fix, endpoint, validation
  rule, state transition, or failure mode, write the failing test before the
  implementation, then make it pass and refactor with the suite green. A change
  is not complete unless its behavior is covered by an automated regression
  test.
- Build a regression suite around the workflows the app supports, not around
  implementation details. Cover the complete observable path at the closest
  useful boundary: request to response and persisted state for server flows;
  user action to rendered result and API interaction for browser flows; pure
  unit tests for isolated rules.
- Exercise the happy path and meaningful alternatives, including validation,
  authorization and tenant isolation, stale or duplicate requests, conflicts,
  retries, failure recovery, and invariants such as privacy and preserved data.
  When a bug is found, reproduce it with a failing regression test before
  fixing it.
- Do not mock away the contract being tested. Repository and migration changes
  need transaction/state assertions; routes need status and response-contract
  assertions; UI workflows should render real components and mock only external
  boundaries such as HTTP.
- Run every affected suite before handing off. Use `npm test` for server and
  pure logic, `npm run test:browser` for changed browser workflows, and
  `npm run build` when production bundling could be affected.
- If you touch theme scoping, keep `colorSchemeScope.test.jsx` (scope
  independence, two disagreeing scopes, portal inheritance) and
  `nestedTheme.test.jsx` (the MUI behaviour it rests on) green.
