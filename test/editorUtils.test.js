import { describe, it, expect } from 'vitest'
import {
  moveItem,
  slugify,
  saveErrorState,
  pageLabel,
  pageSchemeMode,
  toListEntry,
} from '../src/editorUtils.js'

describe('moveItem', () => {
  it('moves an item without mutating the source list', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(list, 2, -1)).toEqual(['a', 'c', 'b'])
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('returns the list unchanged when the move falls off either end', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 0, -1)).toBe(list)
    expect(moveItem(list, 1, 1)).toBe(list)
  })
})

describe('slugify', () => {
  it('lowercases, strips accents and joins on dashes', () => {
    expect(slugify('Underneath the Sun')).toBe('underneath-the-sun')
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu')
    expect(slugify('a  //  b')).toBe('a-b')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  hello!  ')).toBe('hello')
    expect(slugify('---x---')).toBe('x')
    expect(slugify('!!!')).toBe('')
  })

  it('caps at the server RELEASE_TAIL length', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(60)
  })
})

describe('saveErrorState', () => {
  it('separates an expired session from a retryable error', () => {
    expect(saveErrorState({ status: 401 })).toBe('expired')
    expect(saveErrorState({ status: 500 })).toBe('error')
    expect(saveErrorState(undefined)).toBe('error')
  })
})

describe('pageLabel', () => {
  const content = { band: { name: 'The Woods' } }

  it('uses the band name for a main page and the title for a release', () => {
    expect(pageLabel({ pageType: 'main', slug: 'thewoods' }, content)).toBe('The Woods')
    expect(
      pageLabel({ pageType: 'release', slug: 'thewoods/sun', release: { title: 'Sun' } }, content),
    ).toBe('Sun')
  })

  it('falls back to the slug when the name is missing', () => {
    expect(pageLabel({ pageType: 'main', slug: 'thewoods' }, {})).toBe('thewoods')
    expect(pageLabel({ pageType: 'release', slug: 'thewoods/sun' }, content)).toBe('thewoods/sun')
  })
})

describe('pageSchemeMode', () => {
  it('honours an explicit opt-in on the layout', () => {
    expect(pageSchemeMode({ pageType: 'release' }, { theme: 'light' })).toBe('light')
    expect(pageSchemeMode({ pageType: 'main' }, { theme: 'dark' })).toBe('dark')
  })

  // Mirrors normalizeTheme in server/resolve.js — the two must not disagree.
  it('defaults auto to dark for a release and light for the main page', () => {
    expect(pageSchemeMode({ pageType: 'release' }, { theme: null })).toBe('dark')
    expect(pageSchemeMode({ pageType: 'main' }, {})).toBe('light')
    expect(pageSchemeMode({ pageType: 'release' }, undefined)).toBe('dark')
    expect(pageSchemeMode({ pageType: 'main' }, { theme: 'neon' })).toBe('light')
  })
})

describe('toListEntry', () => {
  it('keeps only the switcher fields the server returns', () => {
    const entry = toListEntry({
      id: 7,
      slug: 'thewoods/sun',
      pageType: 'release',
      release: { title: 'Sun' },
      publishedAt: '2026-01-01',
      draftLayout: { sections: [] },
      content: { songs: [] },
    })
    expect(entry).toEqual({
      id: 7,
      slug: 'thewoods/sun',
      pageType: 'release',
      release: { title: 'Sun' },
      publishedAt: '2026-01-01',
    })
  })
})
