import { describe, it, expect } from 'vitest'
import { PAGE_FONT_KEYS, DEFAULT_PAGE_FONT } from '../shared/pageFonts.js'
import { PAGE_FONT_OPTIONS, PAGE_FONT_FACES, PAGE_FONT_FACE_CSS, pageFontSx } from '../src/lib/pageFonts.js'

// The allow-list in shared/ and the asset map in src/lib/ are two halves of one
// contract: the server stores only keys from the list, the client must be able to
// render every one of them. These tests are what stops the two from drifting.
describe('page fonts', () => {
  it('offers exactly the shared allow-list, in the same order', () => {
    expect(PAGE_FONT_OPTIONS.map((o) => o.key)).toEqual(PAGE_FONT_KEYS)
  })

  it('labels every option', () => {
    for (const option of PAGE_FONT_OPTIONS) {
      expect(option.label, option.key).toBeTruthy()
      expect(option.description, option.key).toBeTruthy()
    }
  })

  it('includes the default in the allow-list and loads nothing for it', () => {
    expect(PAGE_FONT_KEYS).toContain(DEFAULT_PAGE_FONT)
    // The default is the theme's own stack: no variable to set, no file to fetch.
    expect(pageFontSx(DEFAULT_PAGE_FONT)).toBeNull()
  })

  it('gives every non-default key a stack and at least one @font-face', () => {
    const families = new Set(PAGE_FONT_FACES.map((face) => face.fontFamily))
    for (const key of PAGE_FONT_KEYS.filter((k) => k !== DEFAULT_PAGE_FONT)) {
      const sx = pageFontSx(key)
      expect(sx, key).not.toBeNull()
      const stack = sx['--lb-page-font']
      expect(stack, key).toBeTruthy()
      // The stack's first family is the custom face; the rest is the fallback.
      const primary = stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
      expect(families, key).toContain(primary)
      expect(stack.split(',').length, key).toBeGreaterThan(1)
    }
  })

  it('declares self-hosted, swap-displayed faces covering every weight the theme uses', () => {
    expect(PAGE_FONT_FACES.length).toBeGreaterThan(0)
    for (const face of PAGE_FONT_FACES) {
      expect(face.fontDisplay, face.fontFamily).toBe('swap')
      expect(face.src, face.fontFamily).toMatch(/format\('woff2'\)/)
      // No third-party host may appear in a face the public page loads.
      expect(face.src, face.fontFamily).not.toMatch(/https?:\/\//)
      // A weight range, so the browser matches a real face at 400/500/600/700
      // rather than synthesising one.
      const [min, max] = String(face.fontWeight).split(' ').map(Number)
      expect(min, face.fontFamily).toBeLessThanOrEqual(400)
      expect(max, face.fontFamily).toBeGreaterThanOrEqual(700)
    }
  })

  it('gives each face a rule of its own in the injected CSS', () => {
    // Every face needs its own @font-face block. Collapsing them into one rule
    // leaves only the last family declared, and every other page silently
    // renders in the fallback stack.
    const rules = PAGE_FONT_FACE_CSS.split('@font-face').filter((chunk) => chunk.trim())
    expect(rules).toHaveLength(PAGE_FONT_FACES.length)
    for (const face of PAGE_FONT_FACES) {
      const rule = rules.find((r) => r.includes(`font-family:'${face.fontFamily}'`))
      expect(rule, face.fontFamily).toBeTruthy()
      expect(rule, face.fontFamily).toContain(face.src)
      expect(rule, face.fontFamily).toContain('font-display:swap')
    }
  })

  it('falls back to the theme default for an unknown key', () => {
    expect(pageFontSx('papyrus')).toBeNull()
    expect(pageFontSx(undefined)).toBeNull()
  })
})
