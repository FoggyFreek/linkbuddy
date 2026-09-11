---
name: page-backgrounds
description: Add or change a page background (a "scene") or one of its colourways in src/lib/pageBackgrounds.ts — including importing a designed .svg, deriving the dark colourway, and offering colourways as dots in the editor's BackgroundPicker. Use whenever a background, scene, colourway, swatch or background artwork is being added, imported, recoloured or removed.
---

# Page backgrounds

A background is a self-contained SVG scene rendered to a data URI and applied as a
CSS `background-image`. Read the header comment of `src/lib/pageBackgrounds.ts`
before editing — it carries the contract; this file is the procedure.

Two kinds of entry:

- **Scene** — one drawing scaled to `cover`. Every entry below `none` except the
  last three.
- **Seamless tile** — declares `tile` and repeats, deliberately low-contrast.
  Tiles take their two colours from the page's light/dark scheme, so **tiles
  never get colourways**.

## Adding a scene

1. **Add the key** to `PAGE_BACKGROUND_KEYS` in
   `shared/features/appearance/pageBackgrounds.js`, in the position it should
   occupy in the picker. Both runtimes read that list, so the server allow-list,
   the editor's grid and the public page can't drift.
2. **Write the art function** in `src/lib/pageBackgrounds.ts`, next to the scenes
   it belongs with. It takes a palette object and reads *named slots* —
   `p.canvas`, `p.ink`, `p.layers[i]`. Never hard-code a colour, an opacity or a
   radius in the drawing code: anything a colourway might want to change is a
   slot. Use the shared `scene()` helper (900×1400) unless the artwork's own
   proportions matter, as with `sand`.
3. **Add the `BACKGROUNDS` entry** — `label`, `description`, `art`, and a `light`
   and `dark` palette. The order of entries must match `PAGE_BACKGROUND_KEYS`.
4. **Tests** (write them first):
   - `src/lib/__tests__/pageBackground.test.jsx` — one focused test asserting
     what makes this scene itself: its canvas colour, and structure in the
     decoded SVG (ring count and paint order, layer count, gradient centres).
     The existing "every scene its own artwork" test covers it automatically.
   - `server/features/editor/__tests__/layout.test.js` — one line asserting the
     server stores the new key.

## Importing a designed .svg

Faithfulness first: keep the artwork's own geometry, and parameterize only its
colours.

- **Bulk path data goes in its own `src/lib/*.ts` module** (see `fluidShapes.ts`,
  `sandLayers.ts`), exported as a const with the canvas size it was authored on.
  A short path (a ray star, a handful of curves) can stay inline in the art
  function as a const.
- **Round coordinates** to whole units, or one decimal where a shape is small.
  At cover scale that is far under a pixel and it cut `sand` from 60 kB to 34 kB.
- **Recentre and scale rather than redraw**: wrap the imported path in
  `translate(cx cy) scale(k) translate(-x0 -y0)` to move its authored centre onto
  this canvas, as `sunburstArt` does.
- **Derive the dark colourway, then look at it.** Scaling every channel (`sand`
  ≈ 0.62) is a good starting point, not an answer — `sunburst` needed a brighter
  core than the scaled ramp gave, or the burst read as flat.

### Look at what you built

Artwork claims need eyes, not just green tests. Render both colourways the way
the page does — a data URI in a `background-size: cover` div at page proportions
(~480×760) — and screenshot it with Playwright from the project root (the
scratchpad has no `node_modules`). Opening the `.svg` file directly is *not* the
same view: a fixed-size SVG larger than the viewport renders cropped to its
top-left corner, which once made a full scene look like two flat bands.

## Adding a colourway

A colourway is an alternate palette of a scene, offered as a small colour dot
overlaid on that scene's own swatch — never as another swatch in the grid.

1. **Key it `<scene>-<colourway>`** (`sunburst-ember`) and add it to
   `PAGE_BACKGROUND_KEYS` right after its scene. It is an ordinary background
   key: no new layout field, no new validation path.
2. **Add a `BACKGROUNDS` entry** reusing the scene's `art`, plus two fields:
   `base: '<scene>'` (keeps it out of the picker grid) and `colourway: 'Ember'`
   (the dot's label). Give the *scene* a `colourway` too — it is the first dot.
   Dots appear only when a scene has more than one.
3. **Nothing to change in the editor.** `PAGE_BACKGROUND_OPTIONS` carries a
   `colourways` array per option and `backgroundBaseKey()` maps a colourway back
   to its swatch; `BackgroundPicker` renders the dots, keeps the scene pressed,
   and repaints the swatch with the chosen colourway.
4. **Dot colours are derived, never declared.** `paletteColors()` takes the
   scene's ramp if it has one (`layers`, `rings` — the ramp is what a colourway
   *is*), otherwise its colour slots in declaration order; deduped, non-colour
   slots skipped, and sampled to five columns with both ends kept, so an
   18-ring ramp still reads at 16px. A dot therefore cannot drift from its
   artwork — so order a palette the way it should read, and keep structural
   slots (a black seam, a shadow) out of a ramp.
5. **Build a ramp by interpolating anchors** rather than hand-picking eight
   steps: two or three anchors through an even RGB interpolation step cleanly.
   The dark ramp may need to run the *other way* — `sand` goes light-to-dark in
   light and dark-to-light in dark, which is what keeps the ridges deep — so
   check the scene before mirroring its light ramp.
6. **Tests** — assert the colourway is not a grid option, that its dot appears
   only once the scene is chosen, that clicking it reports the colourway key,
   and that the scene's swatch stays pressed while painting the colourway's
   artwork. Plus the one-line server key assertion. For a scene that already has
   colourways, that is one more `it.each` row.

## Invariants

- **No CSS custom properties inside a data URI.** They don't resolve, which is
  why every scene is drawn twice and `pageBackgroundSx` swaps the whole image per
  scheme via `theme.applyStyles('dark', …)` — never a `[data-theme='dark'] &`
  selector, which would break a light page inside a dark editor.
- **The scene paints its own opaque canvas** so it fully replaces the theme's
  `surface.canvas`, and the entry's `canvas` slot is the matching
  `backgroundColor`.
- **`IMAGES` is built once at module load.** Keep art functions pure and cheap;
  don't reach for per-render palettes without dealing with that cache.
- **No font, image or fetch from a third party** — a public page view must hit
  nothing but this origin.
