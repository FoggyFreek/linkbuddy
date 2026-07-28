import { describe, it, expect } from 'vitest'
import { trim, trimStart, trimEnd } from '../src/utils/trimChars.js'

describe('trimChars', () => {
  it('trims runs from the requested end only', () => {
    expect(trimStart('///a/b//', '/')).toBe('a/b//')
    expect(trimEnd('///a/b//', '/')).toBe('///a/b')
    expect(trim('///a/b//', '/')).toBe('a/b')
  })

  it('leaves interior characters and non-matching ends alone', () => {
    expect(trim('a//b', '/')).toBe('a//b')
    expect(trim('abc', '/')).toBe('abc')
    expect(trim('', '/')).toBe('')
  })

  it('collapses a string that is entirely the trimmed character', () => {
    expect(trim('/////', '/')).toBe('')
    expect(trimStart('---', '-')).toBe('')
    expect(trimEnd('---', '-')).toBe('')
  })

  it('stays linear on the input these replaced regexes backtracked on', () => {
    const pathological = `/${'/'.repeat(50_000)}a`
    const started = performance.now()
    expect(trim(pathological, '/')).toBe('a')
    expect(performance.now() - started).toBeLessThan(100)
  })
})
