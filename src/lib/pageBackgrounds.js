// Theme-aware SVG backgrounds a band can put behind its public page. The set
// moves from quiet gradients through clean geometry to hand-drawn scenes.
//
// Each background is a self-contained SVG scene, applied as a CSS
// `background-image` (a data URI) rather than a DOM node: the artwork then costs
// the page no markup, no stacking context and no z-index bookkeeping, so it
// works identically behind the full-bleed public page, behind the framed editor
// preview, and inside the little swatches of the background picker — the same
// `sx` in all three places.
//
// The hand-drawn scenes (bloom, blobs, confetti) are not hand-authored
// path noise: they are built from clean geometry (circles, arcs, straight-ish
// curves) run through a `feTurbulence` + `feDisplacementMap` filter, which pushes
// the outlines around like a wobbling pen — typically two filters per scene, a
// soft one for the big colour surfaces and a livelier one for the pen strokes on
// top. The quieter scenes above them use no filter at all.
//
// Each scene is drawn twice, once per colour scheme, because CSS custom
// properties do not resolve inside a data-URI SVG: the palette is a parameter of
// the art function, and `pageBackgroundSx` swaps the whole image per scheme. The
// scene paints its own opaque canvas colour, so it fully replaces the theme's
// `surface.canvas` backdrop instead of blending with it.
// The last three are different in kind: seamless tiles rather than one big
// scene. They declare a `tile` size and repeat across the page instead of being
// scaled to `cover`, and they stay deliberately low-contrast — quiet texture on
// a canvas near the theme's own, not artwork.
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../shared/pageBackgrounds.js'
import { SQUARES_TILE, HEXAGONS_TILE, TOPOGRAPHY_TILE } from './patternTiles.js'
import { FLUID_SHAPES } from './fluidShapes.js'

const W = 900
const H = 1400

// A wobbling pen: displaces whatever it filters by fractal noise, so straight
// edges and perfect circles come out as if drawn by hand. `scale` is the wobble
// amplitude in user units, `freq` its wavelength (lower = longer, lazier waves).
function penFilter(id, { freq, scale, seed }) {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="noise"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`
    + '</filter>'
}

function scene(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
}

// A run of roughly parallel pen strokes — the sketcher's shading gesture.
function hatch(x, y, { count = 4, length = 90, gap = 14, angle = 0, color, width = 5 }) {
  let out = `<g transform="translate(${x} ${y}) rotate(${angle})" stroke="${color}" stroke-width="${width}" stroke-linecap="round">`
  for (let i = 0; i < count; i += 1) {
    const offset = i * gap
    const shrink = i % 2 ? 12 : 0
    out += `<path d="M0 ${offset} L${length - shrink} ${offset}" />`
  }
  return `${out}</g>`
}

// ---------------------------------------------------------------------------
// 1–8. Abstract collection, from quiet gradients to bold graphic scenes
// ---------------------------------------------------------------------------

// Background 1: Glow.
// Three oversized radial washes over a diagonal base gradient. There are no
// hard edges, so this is the calmest option in the set and works especially
// well for pages with a lot of cards.
function glowArt(p) {
  return scene(
    '<defs>'
    + `<linearGradient id="glowBase" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/></linearGradient>`
    + `<radialGradient id="glowA"><stop stop-color="${p.a}" stop-opacity="${p.aOpacity}"/><stop offset="1" stop-color="${p.a}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="glowB"><stop stop-color="${p.b}" stop-opacity="${p.bOpacity}"/><stop offset="1" stop-color="${p.b}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="glowC"><stop stop-color="${p.c}" stop-opacity="${p.cOpacity}"/><stop offset="1" stop-color="${p.c}" stop-opacity="0"/></radialGradient>`
    + '</defs>'
    + `<rect width="${W}" height="${H}" fill="url(#glowBase)"/>`
    + '<ellipse cx="90" cy="160" rx="620" ry="560" fill="url(#glowA)"/>'
    + '<ellipse cx="860" cy="650" rx="660" ry="700" fill="url(#glowB)"/>'
    + '<ellipse cx="260" cy="1390" rx="620" ry="560" fill="url(#glowC)"/>',
  )
}

// Long contour strokes drift across the canvas like a topographic map. A
// vertical stroke gradient carries the lines from electric pink into warm
// amber while the field itself stays nearly black.
function gradientLinesArt(p) {
  const paths = [
    'M-90 65 C80 55 135 -80 260 -35 C390 15 430 120 565 65 C690 15 690 -45 825 15 C900 48 950 35 1010 5',
    'M-90 165 C80 180 165 25 315 45 C460 65 510 210 660 175 C775 150 850 75 1015 120',
    'M-95 235 C60 270 165 120 300 130 C445 140 500 260 635 260 C760 260 865 185 1010 235',
    'M-85 345 C70 390 145 245 300 245 C440 245 530 350 690 355 C810 360 875 300 1015 315',
    'M-80 465 C55 510 165 365 315 365 C470 365 525 455 690 470 C830 482 900 420 1010 445',
    'M-75 575 C70 625 175 505 335 505 C485 505 565 585 705 590 C845 595 900 545 1010 565',
    'M-85 685 C55 735 155 625 320 630 C480 635 550 715 695 710 C820 705 900 650 1010 685',
    'M-70 805 C65 850 165 745 315 760 C465 775 555 825 700 810 C825 797 910 770 1015 805',
    'M-80 915 C40 965 130 875 260 890 C410 908 525 925 670 900 C810 875 900 840 1015 900',
    'M-90 1035 C30 1085 135 990 275 1010 C425 1032 535 1025 680 1005 C825 985 915 965 1010 1015',
    'M-85 1150 C40 1190 130 1105 270 1125 C420 1147 535 1125 675 1115 C815 1105 900 1080 1010 1140',
    'M-75 1260 C75 1305 145 1195 305 1220 C455 1245 545 1210 700 1215 C835 1220 915 1195 1010 1250',
    'M-80 1375 C55 1420 160 1320 315 1340 C470 1360 560 1325 710 1345 C840 1362 925 1340 1010 1390',
  ]
  return scene(
    '<defs>'
    + `<linearGradient id="lineInk" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">`
    + `<stop stop-color="${p.pink}"/><stop offset=".48" stop-color="${p.coral}"/><stop offset="1" stop-color="${p.gold}"/>`
    + '</linearGradient>'
    + '</defs>'
    + `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + `<g fill="none" stroke="url(#lineInk)" stroke-width="${p.width}" stroke-linecap="round">`
    + paths.map((d) => `<path d="${d}"/>`).join('')
    + '</g>',
  )
}

// Layered, free-flowing dune shapes. Each broad band uses a gentle directional
// gradient, so the result has the depth of raked sand while remaining clearly
// flat, abstract vector artwork.
function sandArt(p) {
  const boundaries = [
    'M120 -70 C65 115 205 275 130 455 C55 640 220 775 145 970 C85 1125 205 1285 160 1470',
    'M285 -70 C235 145 390 260 305 465 C240 625 405 755 330 930 C265 1080 415 1260 350 1470',
    'M455 -70 C520 110 375 290 470 460 C555 615 420 760 500 925 C575 1080 455 1260 520 1470',
    'M620 -70 C550 135 700 275 625 470 C560 640 720 750 660 930 C610 1090 755 1245 700 1470',
    'M770 -70 C850 125 705 295 805 455 C890 590 750 790 830 950 C905 1090 805 1270 865 1470',
    'M900 -70 C855 155 965 300 910 510 C870 670 970 825 925 1010 C890 1165 960 1325 945 1470',
  ]
  return scene(
    `<rect width="${W}" height="${H}" fill="${p.layers[0]}"/>`
    + boundaries.map((d, i) =>
      `<path d="${d} L980 1470 L980 -70 Z" fill="${p.layers[i + 1]}"/>`).join(''),
  )
}

// Parallel bezier ribbons sweep diagonally behind the content. A pair of thin
// highlights gives the flat bands a screen-printed edge without turning them
// into three-dimensional objects.
function ribbonsArt(p) {
  return scene(
    `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + '<g fill="none" stroke-linecap="round">'
    + `<path d="M-260 280 C 120 10, 340 430, 650 225 C 860 85, 1020 115, 1180 245" stroke="${p.band1}" stroke-width="210"/>`
    + `<path d="M-230 930 C 70 700, 310 980, 555 795 C 790 615, 1010 745, 1160 610" stroke="${p.band2}" stroke-width="170"/>`
    + `<path d="M-180 1450 C 110 1160, 380 1460, 690 1210 C 875 1060, 1050 1100, 1160 1010" stroke="${p.band3}" stroke-width="235"/>`
    + `<path d="M-180 212 C 115 -2, 350 360, 640 165 C 845 30, 1020 75, 1130 170" stroke="${p.line1}" stroke-width="8" opacity=".8"/>`
    + `<path d="M-160 1372 C 110 1105, 395 1385, 670 1152 C 850 1000, 1010 1040, 1120 960" stroke="${p.line2}" stroke-width="7" opacity=".72"/>`
    + '</g>',
  )
}

// An oversized orbital system sits off-centre, keeping the middle readable.
// Repeated line weights and a sparse dot field make it feel musical—almost like
// grooves on a record—without depicting a literal object.
function orbitArt(p) {
  const rings = [150, 235, 325, 420, 520]
    .map((r, i) => `<circle cx="765" cy="360" r="${r}" stroke="${i % 2 ? p.ring2 : p.ring1}" stroke-width="${i === 4 ? 3 : 5}" opacity="${0.9 - i * 0.1}"/>`)
    .join('')
  return scene(
    '<defs>'
    + `<radialGradient id="orbitWash" cx="80%" cy="20%"><stop stop-color="${p.wash}" stop-opacity=".8"/><stop offset="1" stop-color="${p.canvas}" stop-opacity="0"/></radialGradient>`
    + '</defs>'
    + `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + `<rect width="${W}" height="${H}" fill="url(#orbitWash)"/>`
    + `<g fill="none">${rings}</g>`
    + `<circle cx="765" cy="360" r="82" fill="${p.core}"/>`
    + `<circle cx="366" cy="221" r="28" fill="${p.dot1}"/>`
    + `<circle cx="285" cy="685" r="18" fill="${p.dot2}"/>`
    + `<circle cx="760" cy="965" r="44" fill="${p.dot1}"/>`
    + `<circle cx="96" cy="1195" r="25" fill="${p.dot3}"/>`
    + `<path d="M-80 1080 C 180 930, 420 1115, 660 995 C 820 915, 970 940, 1040 885" fill="none" stroke="${p.ring2}" stroke-width="5" stroke-dasharray="12 22"/>`,
  )
}

// A restrained Bauhaus-like composition of rectangles, discs and wedges. The
// pieces stay large enough to read in picker swatches and at phone widths.
function mosaicArt(p) {
  return scene(
    `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + '<g transform="rotate(-8 450 700)">'
    + `<rect x="-80" y="60" width="430" height="250" rx="34" fill="${p.a}"/>`
    + `<circle cx="700" cy="170" r="190" fill="${p.b}"/>`
    + `<path d="M485 0 L900 0 L900 395 Z" fill="${p.c}"/>`
    + `<rect x="650" y="465" width="330" height="185" rx="92" fill="${p.d}"/>`
    + `<circle cx="118" cy="690" r="132" fill="${p.c}"/>`
    + `<path d="M325 470 L610 640 L325 810 Z" fill="${p.b}"/>`
    + `<rect x="-75" y="990" width="530" height="275" rx="40" fill="${p.d}"/>`
    + `<path d="M510 930 L970 780 L970 1190 Z" fill="${p.a}"/>`
    + `<circle cx="660" cy="1320" r="210" fill="${p.b}"/>`
    + `<circle cx="660" cy="1320" r="92" fill="${p.canvas}"/>`
    + '</g>'
    + `<g fill="none" stroke="${p.ink}" stroke-width="5" opacity=".72">`
    + '<path d="M75 390 H285"/><path d="M110 420 H350"/><path d="M560 700 H845"/>'
    + '<path d="M520 735 H760"/><path d="M40 1330 H300"/>'
    + '</g>',
  )
}

// A single abstract bloom, cropped hard by the canvas. The translucent petals
// overlap like screen-printed ink while the loose contour lends the more
// artistic end of the collection a tactile finish.
function bloomArt(p) {
  const petals = [
    [450, 255, 205, 370, 0, p.p1],
    [700, 430, 205, 370, 58, p.p2],
    [690, 735, 205, 370, 112, p.p3],
    [420, 880, 205, 370, 174, p.p1],
    [170, 705, 205, 370, 230, p.p2],
    [185, 400, 205, 370, 302, p.p3],
  ].map(([cx, cy, rx, ry, angle, fill]) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${angle} ${cx} ${cy})" fill="${fill}" opacity="${p.opacity}"/>`)
    .join('')
  return scene(
    `<defs>${penFilter('bloomEdge', { freq: '0.009 0.014', scale: 18, seed: 14 })}</defs>`
    + `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + `<g filter="url(#bloomEdge)">${petals}</g>`
    + `<circle cx="445" cy="565" r="168" fill="${p.center}"/>`
    + `<circle cx="445" cy="565" r="216" fill="none" stroke="${p.ink}" stroke-width="8" stroke-dasharray="18 25" opacity=".7"/>`
    + `<path d="M80 1230 C 240 1080, 570 1110, 855 930" fill="none" stroke="${p.ink}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M145 1320 C 365 1190, 620 1240, 920 1085" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  )
}

// Background 7: Blobs. Round, solid, cut-paper shapes sit toward the edges,
// leaving the middle column comparatively calm.
function blobsArt(p) {
  const blob = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  const ring = (cx, cy, r, stroke, width = 6) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`
  return scene(
    `<defs>${penFilter('blobSoft', { freq: '0.006 0.009', scale: 26, seed: 7 })}`
    + `${penFilter('blobPen', { freq: '0.02 0.03', scale: 9, seed: 3 })}</defs>`
    + `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + `<g filter="url(#blobSoft)">`
    + blob(120, 170, 185, p.orange)
    + blob(770, 105, 125, p.yellow)
    + blob(455, 55, 70, p.cream)
    + blob(835, 505, 95, p.coral)
    + blob(60, 735, 140, p.teal)
    + blob(690, 700, 55, p.yellow)
    + blob(285, 1300, 165, p.yellow)
    + blob(755, 1185, 120, p.violet)
    + blob(105, 1085, 60, p.coral)
    + '</g>'
    + `<g filter="url(#blobPen)">`
    + ring(600, 300, 52, p.yellow)
    + ring(210, 465, 34, p.coral, 5)
    + ring(470, 1075, 44, p.teal, 5)
    + ring(820, 880, 62, p.cream, 4)
    + hatch(150, 560, { count: 5, length: 120, gap: 16, angle: -14, color: p.cream, width: 4 })
    + hatch(560, 880, { count: 4, length: 100, gap: 15, angle: 12, color: p.orange })
    + hatch(660, 1330, { count: 4, length: 95, gap: 15, angle: -8, color: p.teal })
    + `<path d="M40 985 C 200 940, 320 1020, 470 960" fill="none" stroke="${p.cream}" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M470 620 C 610 560, 720 640, 860 600" fill="none" stroke="${p.orange}" stroke-width="5" stroke-linecap="round"/>`
    + '</g>',
  )
}

// ---------------------------------------------------------------------------
// 8. Confetti — scattered ink doodles
// ---------------------------------------------------------------------------

// Loose party doodles thrown across the page: zigzags, spirals, crosses, arcs,
// triangles and dots, each in its own vibrant ink. Nothing is large, so the
// scene stays busy at the edges and airy behind the content.
function confettiArt(p) {
  const [c1, c2, c3, c4, c5] = p.inks
  const dot = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  const zig = (x, y, color, scale = 1) =>
    `<path transform="translate(${x} ${y}) scale(${scale})" d="M0 0 L22 -26 L44 0 L66 -26 L88 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`
  const spiral = (x, y, color) =>
    `<path transform="translate(${x} ${y})" d="M0 0 C 26 -22, 56 -4, 44 22 C 34 44, 2 44, -6 20 C -16 -12, 22 -30, 50 -14" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`
  const cross = (x, y, color, size = 22) =>
    `<g transform="translate(${x} ${y})" stroke="${color}" stroke-width="7" stroke-linecap="round"><path d="M-${size} -${size} L${size} ${size}"/><path d="M${size} -${size} L-${size} ${size}"/></g>`
  const arc = (x, y, color, r = 46) =>
    `<path transform="translate(${x} ${y})" d="M-${r} 0 A ${r} ${r} 0 0 1 ${r} 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`
  const triangle = (x, y, color, size = 34) =>
    `<path transform="translate(${x} ${y})" d="M0 -${size} L${size} ${size} L-${size} ${size} Z" fill="${color}"/>`
  const blob = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  return scene(
    `<defs>${penFilter('confSoft', { freq: '0.007 0.011', scale: 22, seed: 2 })}`
    + `${penFilter('confPen', { freq: '0.022 0.03', scale: 7, seed: 9 })}</defs>`
    + `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    // A few big soft shapes give the doodles something to sit on.
    + `<g filter="url(#confSoft)" opacity="${p.washOpacity}">`
    + blob(70, 120, 155, c2)
    + blob(850, 330, 130, c4)
    + blob(150, 1060, 120, c3)
    + blob(830, 1250, 150, c1)
    + '</g>'
    + `<g filter="url(#confPen)">`
    + zig(70, 330, c1)
    + zig(600, 140, c3, 0.9)
    + zig(180, 720, c5, 1.1)
    + zig(640, 1100, c2)
    + spiral(790, 620, c1)
    + spiral(120, 500, c4)
    + spiral(520, 1310, c3)
    + cross(430, 250, c5)
    + cross(830, 830, c2, 18)
    + cross(240, 940, c1, 20)
    + cross(700, 400, c4, 16)
    + arc(160, 1210, c2)
    + arc(660, 900, c5, 38)
    + arc(480, 600, c3, 42)
    + triangle(300, 100, c4)
    + triangle(760, 1010, c3, 26)
    + triangle(60, 900, c5, 22)
    + dot(560, 470, 15, c2)
    + dot(230, 620, 12, c3)
    + dot(880, 200, 14, c5)
    + dot(390, 1160, 16, c1)
    + dot(740, 1400, 13, c4)
    + dot(30, 1340, 15, c2)
    + dot(500, 800, 11, c4)
    + hatch(300, 430, { count: 4, length: 84, gap: 15, angle: -18, color: c3, width: 5 })
    + hatch(560, 1240, { count: 3, length: 76, gap: 16, angle: 14, color: c5, width: 5 })
    + '</g>',
  )
}

// Interlocking blobs pour down from the top edge and stop in a soft wave, so the
// colour sits above the content and the rest of the page stays plain canvas.
function fluidArt(p) {
  return scene(
    `<rect width="${W}" height="${H}" fill="${p.canvas}"/>`
    + FLUID_SHAPES.map(({ c, d }) => `<path d="${d}" fill="${p[c]}"/>`).join(''),
  )
}

// ---------------------------------------------------------------------------
// 10–12. Seamless tiles
// ---------------------------------------------------------------------------

// One tile of a repeating pattern: its own viewBox, no canvas rect (the canvas
// colour is a plain `backgroundColor` under the tile) and a single `<g>` giving
// the geometry from patternTiles.js its ink.
function tile(w, h, shapes, p, fillRule = 'nonzero') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<g fill="${p.ink}" fill-opacity="${p.opacity}" fill-rule="${fillRule}">${shapes}</g></svg>`
}

// Concentric square outlines, alternating orientation — the tightest grid of
// the three, so it reads as a fine woven texture rather than as squares.
function squaresArt(p) {
  return tile(70, 70, SQUARES_TILE, p, 'evenodd')
}

// A honeycomb lattice: thin hexagon outlines locked together edge to edge.
function hexagonsArt(p) {
  return tile(28, 49, HEXAGONS_TILE, p)
}

// Contour lines of an imaginary landscape. The tile is large, so the lines wander
// a long way before the pattern comes back around.
function topographyArt(p) {
  return tile(600, 600, TOPOGRAPHY_TILE, p)
}

// Palettes. Light schemes keep a bright canvas with saturated ink; dark schemes
// deepen the canvas and push the inks toward neon so they stay vibrant against
// it. Text never sits directly on a background — the page's content card does —
// so these can be bold without costing legibility.
const BACKGROUNDS = {
  glow: {
    label: 'Glow',
    description: 'A soft, minimal gradient with overlapping pools of colour.',
    art: glowArt,
    light: {
      canvas: '#f4efff', from: '#f8f3ff', to: '#dff4ff',
      a: '#ff9ccf', aOpacity: 0.68, b: '#7d8cff', bOpacity: 0.54,
      c: '#62dfc2', cOpacity: 0.48,
    },
    dark: {
      canvas: '#111027', from: '#15122f', to: '#071f2b',
      a: '#d84f9d', aOpacity: 0.58, b: '#536dff', bOpacity: 0.64,
      c: '#1ab795', cOpacity: 0.46,
    },
  },
  'gradient-lines': {
    label: 'Gradient lines',
    description: 'Flowing contour lines shifting from pink into amber.',
    art: gradientLinesArt,
    light: {
      canvas: '#210721', pink: '#ff3fa4', coral: '#ff716d', gold: '#ffc447',
      width: 4,
    },
    dark: {
      canvas: '#130318', pink: '#ff4aae', coral: '#ff786f', gold: '#ffd05a',
      width: 4,
    },
  },
  sand: {
    label: 'Sand',
    description: 'Flat vertical sand layers stepping from pale ivory to deep ochre.',
    art: sandArt,
    light: {
      canvas: '#fffaf0',
      layers: ['#fffaf0', '#fff2d6', '#f6e4c1', '#e8cf9f', '#d4b47e', '#b98e59', '#967043'],
    },
    dark: {
      canvas: '#d8c39e',
      layers: ['#d8c39e', '#c6ad84', '#ad9067', '#8d6d48', '#6c4e32', '#563923', '#3d2719'],
    },
  },
  ribbons: {
    label: 'Ribbons',
    description: 'Broad flowing bands with clean screen-printed edges.',
    art: ribbonsArt,
    light: {
      canvas: '#f6f0e8', band1: '#ff6b57', band2: '#6558e8', band3: '#16b9a8',
      line1: '#ffcb45', line2: '#23344d',
    },
    dark: {
      canvas: '#111826', band1: '#e8505b', band2: '#7769f2', band3: '#0b9c91',
      line1: '#ffd15c', line2: '#b9d7f2',
    },
  },
  orbit: {
    label: 'Orbit',
    description: 'Fine rhythmic rings, offset discs and a sparse dot field.',
    art: orbitArt,
    light: {
      canvas: '#edf3f4', wash: '#a9e5de', ring1: '#285a66', ring2: '#ef6b5b',
      core: '#ffd44a', dot1: '#ef6b5b', dot2: '#285a66', dot3: '#6657d9',
    },
    dark: {
      canvas: '#0b1920', wash: '#145f66', ring1: '#78d8d2', ring2: '#ff7b68',
      core: '#ffd95e', dot1: '#ff7b68', dot2: '#78d8d2', dot3: '#9b8aff',
    },
  },
  mosaic: {
    label: 'Mosaic',
    description: 'A crisp collage of bold geometric cut-paper shapes.',
    art: mosaicArt,
    light: {
      canvas: '#f8eeda', a: '#ff6047', b: '#ffd23f', c: '#2759cf',
      d: '#20aa86', ink: '#1b2433',
    },
    dark: {
      canvas: '#151720', a: '#ff6d57', b: '#f4c83d', c: '#4775eb',
      d: '#2ac29a', ink: '#e5edf7',
    },
  },
  bloom: {
    label: 'Bloom',
    description: 'An expressive oversized bloom in translucent printed inks.',
    art: bloomArt,
    light: {
      canvas: '#fff3e8', p1: '#ff4f81', p2: '#ff9c3d', p3: '#765ee8',
      center: '#ffd83d', ink: '#63366e', opacity: 0.68,
    },
    dark: {
      canvas: '#211127', p1: '#ff5b8d', p2: '#ff9d42', p3: '#8a72ff',
      center: '#ffe052', ink: '#e6b9f1', opacity: 0.62,
    },
  },
  blobs: {
    label: 'Blobs',
    description: 'Solid round shapes in orange and yellow on a blue field.',
    art: blobsArt,
    light: {
      canvas: '#1f4bd8', orange: '#ff7a1a', yellow: '#ffc93c', coral: '#ff5a6e',
      teal: '#25d3c2', violet: '#a78bfa', cream: '#fdf3e3',
    },
    dark: {
      canvas: '#0b1f52', orange: '#ff8b33', yellow: '#ffd257', coral: '#ff6b7f',
      teal: '#2fe0cd', violet: '#b79dff', cream: '#f4e7d2',
    },
  },
  confetti: {
    label: 'Confetti',
    description: 'Scattered ink doodles — zigzags, spirals and dots.',
    art: confettiArt,
    light: {
      canvas: '#fdf5ff', washOpacity: 0.5,
      inks: ['#ff2f68', '#ffab12', '#0fbf86', '#3a76ff', '#a832ff'],
    },
    dark: {
      canvas: '#120c1e', washOpacity: 0.42,
      inks: ['#ff5f86', '#ffc247', '#2ae0a4', '#6ba0ff', '#c877ff'],
    },
  },
  fluid: {
    label: 'Fluid',
    description: 'Interlocking fluid shapes spilling from the top edge.',
    art: fluidArt,
    light: {
      canvas: '#f7f4ef', mint: '#6fcdb2', plum: '#4b3068', pink: '#e2559b',
      sun: '#eec469', sea: '#3a8ca3',
    },
    dark: {
      canvas: '#12161f', mint: '#4da88f', plum: '#3b2554', pink: '#b8437f',
      sun: '#c9a254', sea: '#2c6f84',
    },
  },
  squares: {
    label: 'Squares',
    description: 'A fine woven grid of nested square outlines.',
    art: squaresArt,
    tile: '70px 70px',
    light: { canvas: '#e9ebf0', ink: '#2c3647', opacity: 0.14 },
    dark: { canvas: '#16273d', ink: '#a8c4e2', opacity: 0.12 },
  },
  hexagons: {
    label: 'Hexagons',
    description: 'A quiet honeycomb lattice of thin hexagon outlines.',
    art: hexagonsArt,
    tile: '56px 98px',
    light: { canvas: '#eceff3', ink: '#33414f', opacity: 0.16 },
    dark: { canvas: '#152437', ink: '#9dc0d8', opacity: 0.14 },
  },
  topography: {
    label: 'Topography',
    description: 'Wandering contour lines, like a weathered map.',
    art: topographyArt,
    tile: '440px 440px',
    light: { canvas: '#eef0ec', ink: '#3c4a45', opacity: 0.24 },
    dark: { canvas: '#141f2e', ink: '#8fb6c9', opacity: 0.22 },
  },
}

function dataUri(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}")`
}

// Render each scene's two colourways once, at module load: the strings are then
// constant and every consumer (page, preview, picker swatch) reuses them.
const IMAGES = Object.fromEntries(
  Object.entries(BACKGROUNDS).map(([key, bg]) => [
    key,
    { light: dataUri(bg.art(bg.light)), dark: dataUri(bg.art(bg.dark)) },
  ]),
)

// The picker's options, in the order they're offered — `none` (the plain themed
// canvas) first, then the scenes, ordered by PAGE_BACKGROUND_KEYS so the editor
// can never offer a key the server would reject.
export const PAGE_BACKGROUND_OPTIONS = PAGE_BACKGROUND_KEYS.map((key) =>
  key === DEFAULT_PAGE_BACKGROUND
    ? { key, label: 'None', description: "The theme's plain canvas." }
    : { key, label: BACKGROUNDS[key].label, description: BACKGROUNDS[key].description },
)

// The `sx` that paints a background. Returns `null` for `none`/unknown keys, so
// a caller can drop `pageBackgroundSx(key)` straight into an `sx` array and get
// the theme's plain canvas when no background is set.
//
// It's an `sx` *function* so the colourway comes from `theme.applyStyles`, which
// every call site evaluates on a ColorSchemeScope's own element — and the scope
// resolves `applyStyles` against its own mode (see ColorSchemeScope.jsx). A
// selector written here couldn't do that: `[data-theme='dark'] &` matches on any
// dark ancestor, so a light page inside a dark editor would paint the dark art.
export function pageBackgroundSx(key) {
  const image = IMAGES[key]
  if (!image) return null
  const bg = BACKGROUNDS[key]
  return (theme) => ({
    backgroundColor: bg.light.canvas,
    backgroundImage: image.light,
    backgroundSize: bg.tile ?? 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: bg.tile ? 'repeat' : 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundColor: bg.dark.canvas,
      backgroundImage: image.dark,
    }),
  })
}
