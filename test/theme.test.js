import { describe, it, expect } from 'vitest'
import theme from '../src/lib/theme.js'

// Guards the design tokens the feature components lean on, so a stray edit to
// theme.js (or responsiveFontSizes dropping component config) is caught here
// rather than as a silent visual regression across the editor.

describe('theme design tokens', () => {
  it('exposes semantic corner-radius tokens alongside the base radius', () => {
    expect(theme.shape.borderRadius).toBe(18)
    expect(theme.shape.pill).toBe(999)
    expect(theme.shape.preview).toBe(24)
    expect(theme.shape.item).toBe(10)
  })

  it('registers the dashed pill button variant', () => {
    const variants = theme.components.MuiButton.variants
    expect(variants.some((v) => v.props.variant === 'pill')).toBe(true)
  })

  it('registers the panel card variant with the shared inset', () => {
    const variant = theme.components.MuiCard.variants.find((v) => v.props.variant === 'panel')
    expect(variant).toBeTruthy()
    expect(variant.style).toMatchObject({ padding: '14px 16px' })
  })
})
