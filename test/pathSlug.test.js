import { describe, it, expect } from 'vitest'
import { parsePagePath, slugFromPath } from '../src/utils/pathSlug.js'

describe('slugFromPath', () => {
  it('parses main and release paths', () => {
    expect(slugFromPath('/thewoods')).toBe('thewoods')
    expect(slugFromPath('/thewoods/underneath-the-sun')).toBe('thewoods/underneath-the-sun')
    expect(slugFromPath('/TheWoods/')).toBe('thewoods') // trailing slash + case
  })

  it('decodes percent-encoded segments', () => {
    expect(slugFromPath('/the%20woods')).toBe('the woods')
  })

  it('returns null for malformed percent-encoding instead of throwing', () => {
    // decodeURIComponent('%E0%A4%A') throws a URIError; must be swallowed.
    expect(() => slugFromPath('/%E0%A4%A')).not.toThrow()
    expect(slugFromPath('/%E0%A4%A')).toBeNull()
    expect(slugFromPath('/foo/%ZZ')).toBeNull()
  })

  it('returns null for empty or over-deep paths', () => {
    expect(slugFromPath('/')).toBeNull()
    expect(slugFromPath('')).toBeNull()
    expect(slugFromPath('/a/b/c')).toBeNull()
  })
})

// The segment count is the router's page-kind signal: release slugs are
// `<mainSlug>/<tail>` and a main slug can never contain '/'.
describe('parsePagePath', () => {
  it('marks a two-segment path as a release and a one-segment path as not', () => {
    expect(parsePagePath('/thewoods')).toEqual({ slug: 'thewoods', isRelease: false })
    expect(parsePagePath('/thewoods/underneath-the-sun')).toEqual({ slug: 'thewoods/underneath-the-sun', isRelease: true })
  })

  it('returns null on the same paths slugFromPath rejects', () => {
    expect(parsePagePath('/')).toBeNull()
    expect(parsePagePath('/a/b/c')).toBeNull()
    expect(parsePagePath('/%E0%A4%A')).toBeNull()
  })
})
