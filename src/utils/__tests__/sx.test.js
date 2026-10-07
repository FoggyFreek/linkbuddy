import { describe, it, expect } from 'vitest'
import { toSxArray } from '../sx.js'

describe('toSxArray', () => {
  it('passes an array through untouched', () => {
    const sx = [{ p: 1 }, false, { m: 2 }]
    expect(toSxArray(sx)).toBe(sx)
  })

  it('wraps a single style object or function', () => {
    const fn = () => ({ p: 1 })
    expect(toSxArray({ p: 1 })).toEqual([{ p: 1 }])
    expect(toSxArray(fn)).toEqual([fn])
  })

  it('turns a missing sx into an empty list', () => {
    expect(toSxArray(undefined)).toEqual([])
  })
})
