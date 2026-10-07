import { describe, it, expect } from 'vitest'
import { clickBreakdown } from '../statsRepo.js'

// The editor shows streaming platforms as their own block and every other
// target in one list, so the per-target counts are split before they leave.
describe('clickBreakdown', () => {
  const rows = [
    { key: 'share:whatsapp', clicks: 9 },
    { key: 'platform:spotify', clicks: 7 },
    { key: 'link:tickets', clicks: 5 },
    { key: 'platform:other', clicks: 4 },
    { key: 'platform:apple', clicks: 2 },
    { key: 'book:open', clicks: 2 },
    { key: 'shop', clicks: 1 },
  ]

  it('lists every platform clicked, by platform id, most clicked first', () => {
    expect(clickBreakdown(rows).byPlatform).toEqual([
      { key: 'spotify', clicks: 7 },
      { key: 'other', clicks: 4 },
      { key: 'apple', clicks: 2 },
    ])
  })

  it('keeps platforms out of the target list and says which targets count as link clicks', () => {
    expect(clickBreakdown(rows).byTarget).toEqual([
      { key: 'share:whatsapp', clicks: 9, outbound: false },
      { key: 'link:tickets', clicks: 5, outbound: true },
      { key: 'book:open', clicks: 2, outbound: false },
      { key: 'shop', clicks: 1, outbound: true },
    ])
  })

  it('caps the target list but never the platforms', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ key: `link:l${i}`, clicks: 100 - i }))
    const platforms = Array.from({ length: 10 }, (_, i) => ({ key: `platform:p${i}`, clicks: 1 }))
    const { byTarget, byPlatform } = clickBreakdown([...many, ...platforms])
    expect(byTarget).toHaveLength(15)
    expect(byPlatform).toHaveLength(10)
  })

  it('is empty when nothing was clicked', () => {
    expect(clickBreakdown([])).toEqual({ byPlatform: [], byTarget: [] })
  })
})
