import { describe, it, expect } from 'vitest'
import { PAGE_THEME_KEYS, DEFAULT_PAGE_THEMES, pageThemeForScheme } from '../pageThemes.js'
import { PAGE_THEME_OPTIONS, themeVariantSx } from '../../../../src/lib/pageThemes.js'

// The allow-list in shared/ and the palette map in src/lib/ are two halves of one
// contract: the server stores only keys from the list, the client must be able to
// paint every one of them. These tests are what stops the two from drifting.
describe('page theme variants', () => {
  it('offers exactly the shared allow-list, grouped by colour scheme', () => {
    const offered = [...PAGE_THEME_OPTIONS.light, ...PAGE_THEME_OPTIONS.dark].map((o) => o.key)
    expect(offered).toEqual(PAGE_THEME_KEYS)
  })

  it("offers three variants per scheme, the scheme's own default first", () => {
    for (const scheme of ['light', 'dark']) {
      expect(PAGE_THEME_OPTIONS[scheme], scheme).toHaveLength(3)
      expect(PAGE_THEME_OPTIONS[scheme][0].key, scheme).toBe(DEFAULT_PAGE_THEMES[scheme])
    }
  })

  it('labels every variant distinctly', () => {
    const labels = [...PAGE_THEME_OPTIONS.light, ...PAGE_THEME_OPTIONS.dark].map((o) => o.label)
    for (const label of labels) expect(label).toBeTruthy()
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps a variant that belongs to the page scheme', () => {
    expect(pageThemeForScheme('dark-forest', 'dark')).toBe('dark-forest')
    expect(pageThemeForScheme('light-sand', 'light')).toBe('light-sand')
  })

  // One stored key across both schemes: flipping the page to the other scheme
  // must land on that scheme's own default rather than painting, say, a forest
  // green canvas over a light page.
  it('falls back to the scheme default for a mismatched, unknown or missing key', () => {
    expect(pageThemeForScheme('dark-forest', 'light')).toBe('light')
    expect(pageThemeForScheme('light-sand', 'dark')).toBe('dark')
    expect(pageThemeForScheme('neon', 'dark')).toBe('dark')
    expect(pageThemeForScheme(null, 'light')).toBe('light')
    expect(pageThemeForScheme(undefined, 'dark')).toBe('dark')
  })

  // Every variant repaints the page by overriding the theme's own palette
  // variables on the scope element, so each needs the full set — a missing one
  // would leave that surface on the default palette and clash.
  it('overrides the whole page palette for every variant', () => {
    const required = [
      '--mui-palette-background-default',
      '--mui-palette-background-paper',
      '--mui-palette-surface-canvas',
      '--mui-palette-surface-s2',
      '--mui-palette-surface-s3',
      '--mui-palette-surface-border',
      '--mui-palette-surface-field',
      '--mui-palette-divider',
      '--mui-palette-text-primary',
      '--mui-palette-text-secondary',
      '--mui-palette-primary-main',
      '--mui-palette-primary-contrastText',
    ]
    for (const key of PAGE_THEME_KEYS) {
      const sx = themeVariantSx(key)
      expect(sx, key).toBeTruthy()
      for (const variable of required) expect(sx, `${key} ${variable}`).toHaveProperty(variable)
      // Channel variables travel with their colour: MUI composes translucent
      // states (hover, ripple) from them, so a colour without its channel would
      // tint the new palette with the old one.
      expect(sx['--mui-palette-text-primaryChannel'], key).toMatch(/^\d+ \d+ \d+$/)
      expect(sx['--mui-palette-background-paperChannel'], key).toMatch(/^\d+ \d+ \d+$/)
    }
  })

  it('paints nothing for an unknown key', () => {
    expect(themeVariantSx('neon')).toBeNull()
    expect(themeVariantSx(undefined)).toBeNull()
  })
})
