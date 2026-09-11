// The client half of the page-theme contract: the shared allow-list says *which*
// keys exist (shared/features/appearance/pageThemes.js, what the server validates
// against), this module says what each one *is* — a full page palette.
//
// A variant is not a second theme. It repaints the one theme by overriding its
// palette *variables* on the page's scope element, so every MUI component and
// every `theme.vars` reference inside that subtree resolves to the variant while
// the editor chrome around it keeps the app's own palette — the same mechanism
// the page font uses (`--lb-page-font`), applied to colour.
//
// Each variant therefore has to carry the whole set: a half-overridden palette
// would mix, say, a forest-green canvas with midnight-blue cards. The scheme's
// own default variant restates the theme's colours verbatim (src/lib/theme.ts),
// which costs nothing and keeps all three variants of a scheme one list.
import { PAGE_THEME_KEYS, DEFAULT_PAGE_THEMES, pageThemeForScheme } from '../../shared/features/appearance/pageThemes.js'
import type { PageTheme } from '../types.js'

export { pageThemeForScheme }

interface ThemePalette {
  default: string
  paper: string
  canvas: string
  s2: string
  s3: string
  border: string
  field: string
  divider: string
  textPrimary: string
  textSecondary: string
  primary: string
  onPrimary: string
}

interface ThemeVariant { label: string; scheme: PageTheme; palette: ThemePalette }

const VARIANTS: Record<string, ThemeVariant> = {
  light: {
    label: 'Paper',
    scheme: 'light',
    palette: {
      default: '#eceef2', paper: '#ffffff', canvas: '#dcdee2',
      s2: '#f0f1f4', s3: '#e4e6ea', border: '#ecedf1', field: '#f7f8fa',
      divider: '#d5d8de', textPrimary: '#17181c', textSecondary: '#5c6066',
      primary: '#17181c', onPrimary: '#ffffff',
    },
  },
  'light-sky': {
    label: 'Sky',
    scheme: 'light',
    palette: {
      default: '#dfe8f4', paper: '#ffffff', canvas: '#c9d9ec',
      s2: '#eaf1f9', s3: '#dae6f3', border: '#e6eef7', field: '#f3f8fd',
      divider: '#c8d6e6', textPrimary: '#14202e', textSecondary: '#4f6278',
      primary: '#14202e', onPrimary: '#ffffff',
    },
  },
  'light-sand': {
    label: 'Sand',
    scheme: 'light',
    palette: {
      default: '#f0e9dd', paper: '#fffdf8', canvas: '#e2d8c5',
      s2: '#f7f1e7', s3: '#ece3d4', border: '#f1eae0', field: '#faf6ef',
      divider: '#ded3c0', textPrimary: '#2a2318', textSecondary: '#6b5f4c',
      primary: '#2a2318', onPrimary: '#fffdf8',
    },
  },
  dark: {
    label: 'Midnight',
    scheme: 'dark',
    palette: {
      default: '#26374d', paper: '#2f4257', canvas: '#16273d',
      s2: '#35485e', s3: '#3f5468', border: 'rgba(255, 255, 255, 0.05)', field: '#35485e',
      divider: 'rgba(255, 255, 255, 0.14)', textPrimary: '#f2f5f9', textSecondary: '#9fb1c2',
      primary: '#f2f5f9', onPrimary: '#26374d',
    },
  },
  'dark-carbon': {
    label: 'Carbon',
    scheme: 'dark',
    palette: {
      default: '#1d1d20', paper: '#26262a', canvas: '#0f0f11',
      s2: '#2b2b30', s3: '#35353b', border: 'rgba(255, 255, 255, 0.07)', field: '#2b2b30',
      divider: 'rgba(255, 255, 255, 0.14)', textPrimary: '#f4f4f6', textSecondary: '#a8a8b0',
      primary: '#f4f4f6', onPrimary: '#1d1d20',
    },
  },
  'dark-forest': {
    label: 'Forest',
    scheme: 'dark',
    palette: {
      default: '#1d3128', paper: '#264034', canvas: '#0f1f18',
      s2: '#2b4738', s3: '#355443', border: 'rgba(255, 255, 255, 0.06)', field: '#2b4738',
      divider: 'rgba(255, 255, 255, 0.14)', textPrimary: '#eef5f0', textSecondary: '#a2bdad',
      primary: '#eef5f0', onPrimary: '#1d3128',
    },
  },
}

// "#rrggbb" → "r g b", the space-separated form MUI's `*Channel` variables hold
// so styles can compose translucent colours (`rgba(<channel> / 0.08)`).
function channel(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

// The palette variables a variant overrides, as an `sx` object for the page's
// ColorSchemeScope element. Unknown key → null (nothing painted, the theme's own
// scheme colours stand), so a layout from an older or newer build still renders.
export function themeVariantSx(key: string | null | undefined) {
  const variant = key ? VARIANTS[key] : undefined
  if (!variant) return null
  const p = variant.palette
  return {
    '--mui-palette-background-default': p.default,
    '--mui-palette-background-defaultChannel': channel(p.default),
    '--mui-palette-background-paper': p.paper,
    '--mui-palette-background-paperChannel': channel(p.paper),
    '--mui-palette-surface-canvas': p.canvas,
    '--mui-palette-surface-s2': p.s2,
    '--mui-palette-surface-s3': p.s3,
    '--mui-palette-surface-border': p.border,
    '--mui-palette-surface-field': p.field,
    '--mui-palette-divider': p.divider,
    '--mui-palette-text-primary': p.textPrimary,
    '--mui-palette-text-primaryChannel': channel(p.textPrimary),
    '--mui-palette-text-secondary': p.textSecondary,
    '--mui-palette-text-secondaryChannel': channel(p.textSecondary),
    '--mui-palette-primary-main': p.primary,
    '--mui-palette-primary-mainChannel': channel(p.primary),
    '--mui-palette-primary-contrastText': p.onPrimary,
    '--mui-palette-primary-contrastTextChannel': channel(p.onPrimary),
  }
}

// The variant's ink: the text colour a theme-coloured background draws in.
// The seamless tile patterns (src/lib/pageBackgrounds.ts) are drawn in the page's
// own palette rather than one of their own, and a data-URI SVG can't read a CSS
// variable, so they bake this in — resolved against the scheme, like everything
// else that reads a stored variant key.
export function themeVariantInk(key: string | null | undefined, scheme: PageTheme): string {
  return VARIANTS[pageThemeForScheme(key, scheme)].palette.textPrimary
}

export interface ThemeVariantOption { key: string; label: string }

// The editor's choices, per colour scheme and in allow-list order — the Theme
// section shows the three that belong to the scheme the page will render in.
export const PAGE_THEME_OPTIONS: Record<PageTheme, ThemeVariantOption[]> = {
  light: variantsFor('light'),
  dark: variantsFor('dark'),
}

function variantsFor(scheme: PageTheme): ThemeVariantOption[] {
  return PAGE_THEME_KEYS
    .filter((key) => VARIANTS[key]?.scheme === scheme)
    .map((key) => ({ key, label: VARIANTS[key].label }))
}

export { DEFAULT_PAGE_THEMES }
