import { describe, it, expect } from 'vitest'
import { findDropTarget, isNoopDrop } from '../utils/dropTarget.js'

// Rows are 40px tall with 8px gaps: s1 holds rows at 0–40 and 48–88, s2 at
// 120–160, and s3 is empty (its drop zone spans 200–240).
const lists = [
  { id: 's1', top: 0, bottom: 88, items: [{ top: 0, bottom: 40 }, { top: 48, bottom: 88 }] },
  { id: 's2', top: 120, bottom: 160, items: [{ top: 120, bottom: 160 }] },
  { id: 's3', top: 200, bottom: 240, items: [] },
]

describe('findDropTarget', () => {
  it('swaps with a row when the pointer is over its middle', () => {
    expect(findDropTarget(20, lists)).toEqual({ mode: 'swap', list: 's1', index: 0 })
    expect(findDropTarget(140, lists)).toEqual({ mode: 'swap', list: 's2', index: 0 })
  })

  it('inserts before or after a row when the pointer is near its edge', () => {
    expect(findDropTarget(3, lists)).toEqual({ mode: 'insert', list: 's1', index: 0 })
    expect(findDropTarget(37, lists)).toEqual({ mode: 'insert', list: 's1', index: 1 })
    expect(findDropTarget(86, lists)).toEqual({ mode: 'insert', list: 's1', index: 2 })
  })

  it('inserts into the gap between two rows', () => {
    expect(findDropTarget(44, lists)).toEqual({ mode: 'insert', list: 's1', index: 1 })
  })

  it('caps the edge zone on tall rows so their middle stays a swap target', () => {
    const tall = [{ id: 's1', top: 0, bottom: 400, items: [{ top: 0, bottom: 400 }] }]
    expect(findDropTarget(20, tall)).toEqual({ mode: 'swap', list: 's1', index: 0 })
    expect(findDropTarget(10, tall)).toEqual({ mode: 'insert', list: 's1', index: 0 })
  })

  it('snaps to the nearest gap when the pointer is between lists', () => {
    expect(findDropTarget(100, lists)).toEqual({ mode: 'insert', list: 's1', index: 2 })
    expect(findDropTarget(112, lists)).toEqual({ mode: 'insert', list: 's2', index: 0 })
  })

  it('drops into an empty list anywhere over it or nearest to it', () => {
    expect(findDropTarget(220, lists)).toEqual({ mode: 'insert', list: 's3', index: 0 })
    expect(findDropTarget(500, lists)).toEqual({ mode: 'insert', list: 's3', index: 0 })
  })

  it('returns null when there is nothing to drop onto', () => {
    expect(findDropTarget(10, [])).toBeNull()
  })
})

describe('isNoopDrop', () => {
  const from = { list: 's1', index: 1 }

  it('treats swapping with itself and inserting beside itself as no-ops', () => {
    expect(isNoopDrop(from, { mode: 'swap', list: 's1', index: 1 })).toBe(true)
    expect(isNoopDrop(from, { mode: 'insert', list: 's1', index: 1 })).toBe(true)
    expect(isNoopDrop(from, { mode: 'insert', list: 's1', index: 2 })).toBe(true)
  })

  it('accepts every real move', () => {
    expect(isNoopDrop(from, { mode: 'swap', list: 's1', index: 0 })).toBe(false)
    expect(isNoopDrop(from, { mode: 'insert', list: 's1', index: 0 })).toBe(false)
    expect(isNoopDrop(from, { mode: 'insert', list: 's2', index: 1 })).toBe(false)
  })
})
