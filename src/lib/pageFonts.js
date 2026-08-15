// The client half of the page-font contract: the shared allow-list says *which*
// keys exist (shared/pageFonts.js, what the server validates against), this
// module says what each one *is* — a family, the woff2 file behind it, and the
// stack the page renders in.
//
// Every face is self-hosted: the .woff2 files ship inside the bundle (Vite
// content-hashes them into dist/assets like the icons in shared/icons), so a
// public page view never talks to a font CDN — see PRIVACY.md.
//
// How a font reaches the page: the theme declares its `fontFamily` as
// `var(--lb-page-font, <system stack>)`, so every MUI typography variant resolves
// through that one variable. `pageFontSx` sets it on the page's scope element and
// the whole subtree re-renders in the chosen face; nothing outside a scope (the
// editor's own chrome) is touched, because the variable is unset at :root.
import { PAGE_FONT_KEYS, DEFAULT_PAGE_FONT } from '../../shared/pageFonts.js'
import interWoff2 from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
import manropeWoff2 from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'
import montserratWoff2 from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'
import oswaldWoff2 from '@fontsource-variable/oswald/files/oswald-latin-wght-normal.woff2'
import loraWoff2 from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2'
import playfairWoff2 from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2'
import spaceGroteskWoff2 from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'
import bebasWoff2 from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2'
import antonWoff2 from '@fontsource/anton/files/anton-latin-400-normal.woff2'
import markerWoff2 from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2'

// `weight` is the @font-face weight *range*. For the variable faces it's the
// font's real wght axis; for the single-weight display faces it's deliberately
// wide, so the browser matches the one drawn face at every weight the type scale
// asks for (400–700) instead of smearing a synthetic bold over it.
const FONTS = {
  inter: {
    label: 'Inter',
    description: 'Clean and neutral. The safe choice for long text.',
    family: 'Inter', fallback: 'sans-serif', weight: '100 900', src: interWoff2,
  },
  manrope: {
    label: 'Manrope',
    description: 'Rounded modern sans with a friendly feel.',
    family: 'Manrope', fallback: 'sans-serif', weight: '200 800', src: manropeWoff2,
  },
  montserrat: {
    label: 'Montserrat',
    description: 'Geometric and wide. Confident headings.',
    family: 'Montserrat', fallback: 'sans-serif', weight: '100 900', src: montserratWoff2,
  },
  oswald: {
    label: 'Oswald',
    description: 'Tall and condensed, like a gig poster.',
    family: 'Oswald', fallback: 'sans-serif', weight: '200 700', src: oswaldWoff2,
  },
  bebas: {
    label: 'Bebas Neue',
    description: 'All-caps display face. Loud and punchy.',
    family: 'Bebas Neue', fallback: 'sans-serif', weight: '100 900', src: bebasWoff2,
  },
  anton: {
    label: 'Anton',
    description: 'Heavy condensed poster type. Maximum impact.',
    family: 'Anton', fallback: 'sans-serif', weight: '100 900', src: antonWoff2,
  },
  lora: {
    label: 'Lora',
    description: 'A warm serif. Classic without feeling stiff.',
    family: 'Lora', fallback: 'serif', weight: '400 700', src: loraWoff2,
  },
  playfair: {
    label: 'Playfair Display',
    description: 'High-contrast serif with an editorial edge.',
    family: 'Playfair Display', fallback: 'serif', weight: '400 900', src: playfairWoff2,
  },
  'space-grotesk': {
    label: 'Space Grotesk',
    description: 'Technical and slightly odd. Electronic leaning.',
    family: 'Space Grotesk', fallback: 'sans-serif', weight: '300 700', src: spaceGroteskWoff2,
  },
  marker: {
    label: 'Permanent Marker',
    description: 'Hand-drawn marker pen. Best on short pages.',
    family: 'Permanent Marker', fallback: 'cursive', weight: '100 900', src: markerWoff2,
  },
}

function stackOf(font) {
  return `'${font.family}', ${font.fallback}`
}

// The faces the app ships, as data.
export const PAGE_FONT_FACES = Object.values(FONTS).map((font) => ({
  fontFamily: font.family,
  fontStyle: 'normal',
  fontDisplay: 'swap',
  fontWeight: font.weight,
  src: `url(${font.src}) format('woff2')`,
}))

// The same faces as the CSS the theme's CssBaseline injects. It has to be a
// string rather than style objects: `@font-face` is one key, so a list of
// objects under it collapses into a single rule and only the last family
// survives. A browser fetches a .woff2 only when rendered text actually uses
// that family, so declaring all of them costs a few hundred bytes of CSS and a
// page using one font downloads exactly one file.
export const PAGE_FONT_FACE_CSS = PAGE_FONT_FACES.map(
  (face) =>
    `@font-face{font-family:'${face.fontFamily}';font-style:${face.fontStyle};` +
    `font-display:${face.fontDisplay};font-weight:${face.fontWeight};src:${face.src};}`,
).join('\n')

// Driven off the shared key list so the picker can never offer a font the server
// would reject. `system` carries no face of its own — it *is* the theme default.
export const PAGE_FONT_OPTIONS = PAGE_FONT_KEYS.map((key) =>
  key === DEFAULT_PAGE_FONT
    ? { key, label: 'System', description: "The reader's own device font. Loads nothing." }
    : { key, label: FONTS[key].label, description: FONTS[key].description },
)

// The page's chosen face as a scope-local override of the theme's font variable.
// `null` for the default or an unknown key, so the scope simply inherits the
// theme's system stack — the same "null means leave it alone" contract
// pageBackgroundSx uses.
export function pageFontSx(key) {
  const font = FONTS[key]
  return font ? { '--lb-page-font': stackOf(font) } : null
}
