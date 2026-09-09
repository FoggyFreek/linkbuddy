import { describe, expect, it } from 'vitest'
import { validateLayout } from '../../editor/layout.js'
import { resolvePage } from '../resolve.js'

const raw = { sections: [{ id: 'awards', title: null, widgets: [{ id: 'a', type: 'accolades', title: ' Awards ', accolades: [{ description: 'Forged' }] }] }] }

describe('accolades content contract', () => {
  it('accepts a carousel and resolves only synced content, dropping injected fields', () => {
    const { layout, error } = validateLayout(raw)
    expect(error).toBeUndefined()
    expect(layout.sections[0].widgets[0]).toEqual({ id: 'a', type: 'accolades', title: 'Awards' })
    const accolades = [{ id: 2, description: 'Best live act', date: '2026-09-01', url: 'https://example.org/award', imageUrl: 'https://example.org/image' }]
    expect(resolvePage({ accolades }, layout).sections[0].widgets[0]).toEqual({ id: 'a', type: 'accolades', title: 'Awards', accolades })
  })
  it('hides the section for empty or older snapshots', () => {
    for (const content of [{}, { accolades: [] }]) {
      expect(resolvePage(content, raw).sections).toEqual([])
    }
  })
})
