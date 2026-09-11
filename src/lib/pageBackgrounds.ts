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
// scaled to `cover`, and they stay deliberately low-contrast — quiet texture,
// not artwork. They also carry no colours of their own: they repeat over the
// theme's own canvas, in the ink of the page's theme variant (src/lib/pageThemes.ts),
// so they follow whichever palette the page is on.
import { PAGE_BACKGROUND_KEYS, DEFAULT_PAGE_BACKGROUND } from '../../shared/features/appearance/pageBackgrounds.js'
import { SQUARES_TILE, HEXAGONS_TILE, TOPOGRAPHY_TILE } from './patternTiles.js'
import { FLUID_SHAPES } from './fluidShapes.js'
import { SAND_LAYERS, SAND_W, SAND_H, SAND_STRETCH } from './sandLayers.js'
import { themeVariantInk } from './pageThemes.js'
import type { Theme } from '@mui/material/styles'
import type { PageTheme } from '../types.js'
import type { SystemStyleObject } from '@mui/system'

type ArtPalette = Record<string, string | number>
interface PenOptions { freq: string | number; scale: string | number; seed: string | number }
interface HatchOptions { count?: number; length?: number; gap?: number; angle?: number; color: string | number; width?: number }

const W = 900
const H = 1400

// A wobbling pen: displaces whatever it filters by fractal noise, so straight
// edges and perfect circles come out as if drawn by hand. `scale` is the wobble
// amplitude in user units, `freq` its wavelength (lower = longer, lazier waves).
function penFilter(id: string, { freq, scale, seed }: PenOptions): string {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="noise"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`
    + '</filter>'
}

function scene(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
}

// A run of roughly parallel pen strokes — the sketcher's shading gesture.
function hatch(x: number, y: number, { count = 4, length = 90, gap = 14, angle = 0, color, width = 5 }: HatchOptions): string {
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
function glowArt(p: ArtPalette): string {
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
function gradientLinesArt(p: ArtPalette): string {
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

// Layered dune ridges, each one a flat colour step of an ochre ramp with a soft
// drop shadow where it overlaps the ridge behind it. The shapes live on their
// own taller canvas (see sandLayers.ts) rather than the shared 900x1400 scene.
function sandArt(p: ArtPalette & { layers: string[] }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SAND_W}" height="${SAND_H}" viewBox="0 0 ${SAND_W} ${SAND_H}" preserveAspectRatio="xMidYMid slice">`
    + '<defs>'
    + '<filter id="sandShadow" x="-30%" y="-30%" width="170%" height="170%" color-interpolation-filters="sRGB">'
    + `<feDropShadow dx="8" dy="10" stdDeviation="12" flood-color="${p.shadow}" flood-opacity="${p.shadowOpacity}"/>`
    + '</filter>'
    + '</defs>'
    + `<rect width="${SAND_W}" height="${SAND_H}" fill="${p.canvas}"/>`
    + `<g transform="scale(1 ${SAND_STRETCH})">`
    + SAND_LAYERS.map((d, i) => `<path filter="url(#sandShadow)" d="${d}" fill="${p.layers[i]}"/>`).join('')
    + '</g></svg>'
}

// Parallel bezier ribbons sweep diagonally behind the content. A pair of thin
// highlights gives the flat bands a screen-printed edge without turning them
// into three-dimensional objects.
function ribbonsArt(p: ArtPalette): string {
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
function orbitArt(p: ArtPalette): string {
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
function mosaicArt(p: ArtPalette): string {
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

// A radiating sun: sixty thin rays fanning out of one point, each pair drawn as
// one continuous star, over a soft radial wash. Both the wash and the rays fade
// from a white core into the palette's edge colour, so the burst reads as light
// rather than as stripes. The star is authored around (400 400) on its own
// 800-unit canvas, so the group recentres and scales it to reach this canvas's
// far corner.
const SUNBURST_RAYS = 'M998.7 439.2c1.7-26.5 1.7-52.7 0.1-78.5L401 399.9c0 0 0-0.1 0-0.1l587.6-116.9c-5.1-25.9-11.9-51.2-20.3-75.8L400.9 399.7c0 0 0-0.1 0-0.1l537.3-265c-11.6-23.5-24.8-46.2-39.3-67.9L400.8 399.5c0 0 0-0.1-0.1-0.1l450.4-395c-17.3-19.7-35.8-38.2-55.5-55.5l-395 450.4c0 0-0.1 0-0.1-0.1L733.4-99c-21.7-14.5-44.4-27.6-68-39.3l-265 537.4c0 0-0.1 0-0.1 0l192.6-567.4c-24.6-8.3-49.9-15.1-75.8-20.2L400.2 399c0 0-0.1 0-0.1 0l39.2-597.7c-26.5-1.7-52.7-1.7-78.5-0.1L399.9 399c0 0-0.1 0-0.1 0L282.9-188.6c-25.9 5.1-51.2 11.9-75.8 20.3l192.6 567.4c0 0-0.1 0-0.1 0l-265-537.3c-23.5 11.6-46.2 24.8-67.9 39.3l332.8 498.1c0 0-0.1 0-0.1 0.1L4.4-51.1C-15.3-33.9-33.8-15.3-51.1 4.4l450.4 395c0 0 0 0.1-0.1 0.1L-99 66.6c-14.5 21.7-27.6 44.4-39.3 68l537.4 265c0 0 0 0.1 0 0.1l-567.4-192.6c-8.3 24.6-15.1 49.9-20.2 75.8L399 399.8c0 0 0 0.1 0 0.1l-597.7-39.2c-1.7 26.5-1.7 52.7-0.1 78.5L399 400.1c0 0 0 0.1 0 0.1l-587.6 116.9c5.1 25.9 11.9 51.2 20.3 75.8l567.4-192.6c0 0 0 0.1 0 0.1l-537.3 265c11.6 23.5 24.8 46.2 39.3 67.9l498.1-332.8c0 0 0 0.1 0.1 0.1l-450.4 395c17.3 19.7 35.8 38.2 55.5 55.5l395-450.4c0 0 0.1 0 0.1 0.1L66.6 899c21.7 14.5 44.4 27.6 68 39.3l265-537.4c0 0 0.1 0 0.1 0L207.1 968.3c24.6 8.3 49.9 15.1 75.8 20.2L399.8 401c0 0 0.1 0 0.1 0l-39.2 597.7c26.5 1.7 52.7 1.7 78.5 0.1L400.1 401c0 0 0.1 0 0.1 0l116.9 587.6c25.9-5.1 51.2-11.9 75.8-20.3L400.3 400.9c0 0 0.1 0 0.1 0l265 537.3c23.5-11.6 46.2-24.8 67.9-39.3L400.5 400.8c0 0 0.1 0 0.1-0.1l395 450.4c19.7-17.3 38.2-35.8 55.5-55.5l-450.4-395c0 0 0-0.1 0.1-0.1L899 733.4c14.5-21.7 27.6-44.4 39.3-68l-537.4-265c0 0 0-0.1 0-0.1l567.4 192.6c8.3-24.6 15.1-49.9 20.2-75.8L401 400.2c0 0 0-0.1 0-0.1L998.7 439.2z'

function sunburstArt(p: ArtPalette): string {
  const [cx, cy] = [450, 470]
  return scene(
    '<defs>'
    + `<radialGradient id="sunWash" cx="${cx}" cy="${cy}" r="${p.washRadius}" gradientUnits="userSpaceOnUse"><stop stop-color="${p.core}"/><stop offset="1" stop-color="${p.washEdge}"/></radialGradient>`
    + `<radialGradient id="sunRays" cx="${cx}" cy="${cy}" r="${p.rayRadius}" gradientUnits="userSpaceOnUse"><stop stop-color="${p.core}"/><stop offset="1" stop-color="${p.rayEdge}"/></radialGradient>`
    + '</defs>'
    + `<rect width="${W}" height="${H}" fill="url(#sunWash)"/>`
    + `<g transform="translate(${cx} ${cy}) scale(${p.rayScale}) translate(-400 -400)" fill-opacity="${p.rayOpacity}">`
    + `<path fill="url(#sunRays)" d="${SUNBURST_RAYS}"/>`
    + '</g>',
  )
}

// A single abstract bloom, cropped hard by the canvas. The translucent petals
// overlap like screen-printed ink while the loose contour lends the more
// artistic end of the collection a tactile finish.
function bloomArt(p: ArtPalette): string {
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

// Concentric rings sweeping out of the top-left corner, stepping through a
// long warm-to-cool ramp so the page reads as one slow vortex rather than a set
// of bands. Painted widest first, each ring drawn over the one behind it, with a
// wide translucent stroke that softens every boundary into a gradient.
function rainbowArt(p: ArtPalette & { rings: string[] }): string {
  return scene(
    `<rect width="${W}" height="${H}" fill="${p.rings[0]}"/>`
    + `<g stroke="${p.seam}" stroke-width="64" stroke-opacity="${p.seamOpacity}">`
    + p.rings.map((fill, i) => `<circle fill="${fill}" cx="0" cy="0" r="${(p.rings.length - i) * 100}"/>`).join('')
    + '</g>',
  )
}

// Background 7: Blobs. Round, solid, cut-paper shapes sit toward the edges,
// leaving the middle column comparatively calm.
function blobsArt(p: ArtPalette): string {
  const blob = (cx: number, cy: number, r: number, fill: string | number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  const ring = (cx: number, cy: number, r: number, stroke: string | number, width = 6) =>
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
function confettiArt(p: ArtPalette & { inks: string[] }): string {
  const [c1, c2, c3, c4, c5] = p.inks
  const dot = (cx: number, cy: number, r: number, fill: string | number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  const zig = (x: number, y: number, color: string, scale = 1) =>
    `<path transform="translate(${x} ${y}) scale(${scale})" d="M0 0 L22 -26 L44 0 L66 -26 L88 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`
  const spiral = (x: number, y: number, color: string) =>
    `<path transform="translate(${x} ${y})" d="M0 0 C 26 -22, 56 -4, 44 22 C 34 44, 2 44, -6 20 C -16 -12, 22 -30, 50 -14" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`
  const cross = (x: number, y: number, color: string, size = 22) =>
    `<g transform="translate(${x} ${y})" stroke="${color}" stroke-width="7" stroke-linecap="round"><path d="M-${size} -${size} L${size} ${size}"/><path d="M${size} -${size} L-${size} ${size}"/></g>`
  const arc = (x: number, y: number, color: string, r = 46) =>
    `<path transform="translate(${x} ${y})" d="M-${r} 0 A ${r} ${r} 0 0 1 ${r} 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`
  const triangle = (x: number, y: number, color: string, size = 34) =>
    `<path transform="translate(${x} ${y})" d="M0 -${size} L${size} ${size} L-${size} ${size} Z" fill="${color}"/>`
  const blob = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
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
function fluidArt(p: ArtPalette): string {
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
function tile(w: number, h: number, shapes: string, p: ArtPalette, fillRule = 'nonzero'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<g fill="${p.ink}" fill-opacity="${p.opacity}" fill-rule="${fillRule}">${shapes}</g></svg>`
}

// Concentric square outlines, alternating orientation — the tightest grid of
// the three, so it reads as a fine woven texture rather than as squares.
function squaresArt(p: ArtPalette): string {
  return tile(70, 70, SQUARES_TILE, p, 'evenodd')
}

// A honeycomb lattice: thin hexagon outlines locked together edge to edge.
function hexagonsArt(p: ArtPalette): string {
  return tile(28, 49, HEXAGONS_TILE, p)
}

// Contour lines of an imaginary landscape. The tile is large, so the lines wander
// a long way before the pattern comes back around.
function topographyArt(p: ArtPalette): string {
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
    colourway: 'Blossom',
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
  'glow-citrus': {
    label: 'Glow',
    description: 'Glow pools in warm amber, coral and gold.',
    art: glowArt,
    base: 'glow',
    colourway: 'Citrus',
    light: {
      canvas: '#fff8ec', from: '#fffaf0', to: '#ffeccd',
      a: '#ffb23f', aOpacity: 0.6, b: '#ff6f6f', bOpacity: 0.5,
      c: '#ffd84d', cOpacity: 0.5,
    },
    dark: {
      canvas: '#1c1408', from: '#221806', to: '#2a1204',
      a: '#c9742a', aOpacity: 0.55, b: '#b3413f', bOpacity: 0.6,
      c: '#c9a336', cOpacity: 0.45,
    },
  },
  'glow-mist': {
    label: 'Glow',
    description: 'Glow pools in quiet sea blues and slate.',
    art: glowArt,
    base: 'glow',
    colourway: 'Mist',
    light: {
      canvas: '#eef3f8', from: '#f4f8fc', to: '#dde9f4',
      a: '#8fb8e0', aOpacity: 0.6, b: '#6f8aa8', bOpacity: 0.5,
      c: '#bcd6e8', cOpacity: 0.55,
    },
    dark: {
      canvas: '#0c141c', from: '#101a24', to: '#08121a',
      a: '#2f5f8c', aOpacity: 0.6, b: '#3d5a75', bOpacity: 0.6,
      c: '#1f4560', cOpacity: 0.5,
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
    description: 'Layered dune ridges stepping from pale ivory into deep ochre.',
    art: sandArt,
    colourway: 'Dune',
    light: {
      canvas: '#faf4e3', shadow: '#4b3826', shadowOpacity: 0.24,
      layers: ['#f6ebcf', '#eeddb7', '#e3c99b', '#d3b681', '#bd9c69', '#a48255', '#896a45', '#705236'],
    },
    dark: {
      canvas: '#1d1610', shadow: '#000000', shadowOpacity: 0.45,
      layers: ['#2a2118', '#352a1e', '#413324', '#4e3e2b', '#5d4a33', '#6d583c', '#7e6746', '#907752'],
    },
  },
  'sand-slate': {
    label: 'Sand',
    description: 'Dune ridges in cool grey-blue stone.',
    art: sandArt,
    base: 'sand',
    colourway: 'Slate',
    light: {
      canvas: '#f4f7fa', shadow: '#243040', shadowOpacity: 0.22,
      layers: ['#eef2f6', '#d5dae0', '#bbc2c9', '#a2aab3', '#89929d', '#707a87', '#566270', '#3d4a5a'],
    },
    dark: {
      canvas: '#10141a', shadow: '#000000', shadowOpacity: 0.45,
      layers: ['#1a1f26', '#232a33', '#2d353f', '#36404c', '#3f4a58', '#485565', '#526071', '#5b6b7e'],
    },
  },
  'sand-rose': {
    label: 'Sand',
    description: 'Dune ridges in blush pink deepening to mauve.',
    art: sandArt,
    base: 'sand',
    colourway: 'Rose',
    light: {
      canvas: '#fff6f4', shadow: '#4b2630', shadowOpacity: 0.22,
      layers: ['#fdf0ef', '#e8d6d7', '#d4bbbf', '#bfa1a7', '#ab868e', '#966c76', '#82515e', '#6d3746'],
    },
    dark: {
      canvas: '#170e12', shadow: '#000000', shadowOpacity: 0.45,
      layers: ['#221419', '#2f1c22', '#3b242b', '#482c34', '#54353e', '#613d47', '#6d4550', '#7a4d59'],
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
  sunburst: {
    label: 'Sunburst',
    description: 'Fine rays fanning out of a bright core into an icy edge.',
    art: sunburstArt,
    colourway: 'Ice',
    light: {
      core: '#ffffff', washEdge: '#00eeff', rayEdge: '#00ffff',
      canvas: '#ffffff', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.8,
    },
    dark: {
      core: '#68b3d0', washEdge: '#05121a', rayEdge: '#0d3a4a',
      canvas: '#68b3d0', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.62,
    },
  },
  'sunburst-ember': {
    label: 'Sunburst',
    description: 'Sunburst rays in ember yellow over deep red.',
    art: sunburstArt,
    base: 'sunburst',
    colourway: 'Ember',
    light: {
      core: '#fff6d8', washEdge: '#e03616', rayEdge: '#ffc21a',
      canvas: '#fff6d8', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.8,
    },
    dark: {
      core: '#ffbe55', washEdge: '#1b0603', rayEdge: '#9c2408',
      canvas: '#ffbe55', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.62,
    },
  },
  'sunburst-lagoon': {
    label: 'Sunburst',
    description: 'Sunburst rays in sea green over deep blue.',
    art: sunburstArt,
    base: 'sunburst',
    colourway: 'Lagoon',
    light: {
      core: '#f0fff8', washEdge: '#0a6ed6', rayEdge: '#24e0a4',
      canvas: '#f0fff8', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.8,
    },
    dark: {
      core: '#67e0b4', washEdge: '#04141a', rayEdge: '#0c4a44',
      canvas: '#67e0b4', washRadius: 700, rayRadius: 1000, rayScale: 1.8, rayOpacity: 0.62,
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
  rainbow: {
    label: 'Rainbow',
    description: 'A slow vortex of rings turning from amber through magenta into midnight.',
    art: rainbowArt,
    colourway: 'Sunset',
    light: {
      canvas: '#ff9d00', seam: '#000000', seamOpacity: 0.05,
      rings: ['#ff9d00', '#fd8b1d', '#f77a2c', '#f06a37', '#e65c40', '#da4e48', '#cc434e', '#bc3952', '#ab3155', '#992c56', '#872856', '#732453', '#60214f', '#4e1e49', '#3c1b42', '#2b1739', '#1c122f', '#100924'],
    },
    dark: {
      canvas: '#9e6100', seam: '#000000', seamOpacity: 0.08,
      rings: ['#9e6100', '#9d5612', '#994c1b', '#954222', '#8f3928', '#87302d', '#7e2a30', '#752333', '#6a1e35', '#5f1b35', '#541935', '#471633', '#3c1431', '#30132d', '#251129', '#1b0e23', '#110b1d', '#0a0616'],
    },
  },
  'rainbow-aurora': {
    label: 'Rainbow',
    description: 'A vortex turning from mint through teal into deep indigo.',
    art: rainbowArt,
    base: 'rainbow',
    colourway: 'Aurora',
    light: {
      canvas: '#9df5c4', seam: '#000000', seamOpacity: 0.05,
      rings: ['#9df5c4', '#85eabf', '#6ce0bb', '#54d5b6', '#3bcbb1', '#31bbb1', '#2caab3', '#2799b5', '#2288b7', '#2077b2', '#2167a6', '#22569b', '#23468f', '#233881', '#1d2e6d', '#172458', '#111a44', '#0b1030'],
    },
    dark: {
      canvas: '#61987a', seam: '#000000', seamOpacity: 0.08,
      rings: ['#61987a', '#529176', '#438b74', '#348471', '#257e6e', '#1e746e', '#1b696f', '#185f70', '#155471', '#144a6e', '#144067', '#153560', '#162b59', '#162350', '#121d44', '#0e1637', '#0b102a', '#070a1e'],
    },
  },
  'rainbow-ash': {
    label: 'Rainbow',
    description: 'A quiet vortex of warm greys sinking into charcoal.',
    art: rainbowArt,
    base: 'rainbow',
    colourway: 'Ash',
    light: {
      canvas: '#e8e2d6', seam: '#000000', seamOpacity: 0.05,
      rings: ['#e8e2d6', '#dbd5ca', '#cec8be', '#c0bbb1', '#b3aea5', '#a5a09a', '#95928e', '#868483', '#777678', '#69696d', '#5d5d62', '#515158', '#45454e', '#3a3a44', '#30303b', '#272732', '#1d1d29', '#141420'],
    },
    dark: {
      canvas: '#908c85', seam: '#000000', seamOpacity: 0.08,
      rings: ['#908c85', '#88847d', '#807c76', '#77746e', '#6f6c66', '#66635f', '#5c5b58', '#535251', '#4a494a', '#414144', '#3a3a3d', '#323237', '#2b2b30', '#24242a', '#1e1e25', '#18181f', '#121219', '#0c0c14'],
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
    light: { opacity: 0.13 },
    dark: { opacity: 0.11 },
  },
  hexagons: {
    label: 'Hexagons',
    description: 'A quiet honeycomb lattice of thin hexagon outlines.',
    art: hexagonsArt,
    tile: '56px 98px',
    light: { opacity: 0.15 },
    dark: { opacity: 0.13 },
  },
  topography: {
    label: 'Topography',
    description: 'Wandering contour lines, like a weathered map.',
    art: topographyArt,
    tile: '440px 440px',
    light: { opacity: 0.22 },
    dark: { opacity: 0.2 },
  },
}

function dataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}")`
}

// Render each scene's two colourways once, at module load: the strings are then
// constant and every consumer (page, preview, picker swatch) reuses them. The
// seamless tiles are left out — their ink comes from the page's theme variant,
// so they are drawn per (tile, variant) on first use and cached below.
const IMAGES = Object.fromEntries(
  Object.entries(BACKGROUNDS)
    .filter(([, bg]) => !('tile' in bg))
    .map(([key, bg]) => [
      key,
      {
        light: dataUri((bg.art as (palette: object) => string)(bg.light)),
        dark: dataUri((bg.art as (palette: object) => string)(bg.dark)),
      },
    ]),
)

type BackgroundKey = keyof typeof BACKGROUNDS

const TILE_IMAGES = new Map<string, string>()

// One tile pattern in one theme variant's ink, drawn on first use. There are
// only a handful of (tile × variant) combinations and each string is reused by
// the page, the preview and the picker swatch, so caching them keeps the data
// URI work to once per combination.
function tileImage(key: BackgroundKey, scheme: PageTheme, variant: string | null | undefined): string {
  const ink = themeVariantInk(variant, scheme)
  const cacheKey = `${key}:${scheme}:${ink}`
  let image = TILE_IMAGES.get(cacheKey)
  if (!image) {
    const bg = BACKGROUNDS[key]
    image = dataUri((bg.art as (palette: object) => string)({ ...bg[scheme], ink }))
    TILE_IMAGES.set(cacheKey, image)
  }
  return image
}

// A scene's colourways: keys that draw the same art from a different palette.
// `base` names the scene they belong to and keeps them out of the picker's grid
// — the editor offers them as colour dots on that scene's own swatch. Only a
// scene that declares a `colourway` has them; the seamless tiles never will,
// since they take their two colours from the page's light/dark scheme.
export interface BackgroundColourway {
  key: string
  label: string
  colors: { light: string[]; dark: string[] }
}

const baseKeyOf = (key: string): string => {
  const bg = BACKGROUNDS[key as BackgroundKey]
  return bg && 'base' in bg ? bg.base : key
}

// The colours a dot shows: a scene's ramp if it has one — the ramp is what that
// colourway *is* — otherwise its colour slots in declaration order. Opacities,
// radii and widths aren't colours and are skipped, and a long ramp is sampled
// evenly (ends kept) so the dot stays legible at 16px.
const DOT_COLORS = 5

function paletteColors(palette: object): string[] {
  const values = Object.values(palette)
  const ramps = values.filter(Array.isArray).flat()
  const colors = [...new Set((ramps.length ? ramps : values)
    .filter((value) => typeof value === 'string' && value.startsWith('#')))]
  if (colors.length <= DOT_COLORS) return colors
  return Array.from({ length: DOT_COLORS }, (_, i) =>
    colors[Math.round((i * (colors.length - 1)) / (DOT_COLORS - 1))])
}

const COLOURWAYS: Record<string, BackgroundColourway[]> = {}
for (const key of PAGE_BACKGROUND_KEYS) {
  const bg = BACKGROUNDS[key as BackgroundKey]
  if (!bg || !('colourway' in bg)) continue
  ;(COLOURWAYS[baseKeyOf(key)] ??= []).push({
    key,
    label: bg.colourway,
    colors: { light: paletteColors(bg.light), dark: paletteColors(bg.dark) },
  })
}

// The key whose swatch represents `key` in the picker: a colourway is shown by
// its scene, everything else by itself.
export function backgroundBaseKey(key: string): string {
  return baseKeyOf(key)
}

// The picker's options, in the order they're offered — `none` (the plain themed
// canvas) first, then the scenes, ordered by PAGE_BACKGROUND_KEYS so the editor
// can never offer a key the server would reject. Colourways are not options of
// their own; they hang off their scene's option.
export const PAGE_BACKGROUND_OPTIONS = PAGE_BACKGROUND_KEYS
  .filter((key) => baseKeyOf(key) === key)
  .map((key) =>
    key === DEFAULT_PAGE_BACKGROUND
      ? { key, label: 'None', description: "The theme's plain canvas.", colourways: [] as BackgroundColourway[] }
      : {
        key,
        label: BACKGROUNDS[key as BackgroundKey].label,
        description: BACKGROUNDS[key as BackgroundKey].description,
        colourways: COLOURWAYS[key] ?? [],
      })

// The `sx` that paints a background. Returns `null` for `none`/unknown keys, so
// a caller can drop `pageBackgroundSx(key)` straight into an `sx` array and get
// the theme's plain canvas when no background is set. `themeVariant` is the
// page's palette key (src/lib/pageThemes.ts): the theme-coloured tile patterns
// are drawn in its ink, the scenes have palettes of their own and ignore it.
//
// It's an `sx` *function* so the colourway comes from `theme.applyStyles`, which
// every call site evaluates on a ColorSchemeScope's own element — and the scope
// resolves `applyStyles` against its own mode (see ColorSchemeScope.tsx). A
// selector written here couldn't do that: `[data-theme='dark'] &` matches on any
// dark ancestor, so a light page inside a dark editor would paint the dark art.
export function pageBackgroundSx(key: string, themeVariant?: string | null): ((theme: Theme) => SystemStyleObject<Theme>) | null {
  const backgroundKey = key as BackgroundKey
  const bg = BACKGROUNDS[backgroundKey]
  if (!bg) return null
  // A seamless tile has no canvas of its own: it repeats over the theme's, which
  // the page's variant repaints (the same `--mui-palette-surface-canvas` the
  // plain `none` background shows), and its ink follows that variant too.
  if ('tile' in bg) {
    return (theme: Theme) => ({
      backgroundColor: 'var(--mui-palette-surface-canvas)',
      backgroundImage: tileImage(backgroundKey, 'light', themeVariant),
      backgroundSize: bg.tile,
      backgroundPosition: 'center top',
      backgroundRepeat: 'repeat',
      ...theme.applyStyles('dark', {
        backgroundImage: tileImage(backgroundKey, 'dark', themeVariant),
      }),
    })
  }
  const image = IMAGES[backgroundKey]
  return (theme: Theme) => ({
    backgroundColor: bg.light.canvas,
    backgroundImage: image.light,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundColor: bg.dark.canvas,
      backgroundImage: image.dark,
    }),
  })
}
