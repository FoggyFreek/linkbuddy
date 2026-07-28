import { describe, it, expect } from 'vitest'
import {
  moveItem,
  moveWidget,
  slugify,
  saveErrorState,
  pageLabel,
  pageSchemeMode,
  toListEntry,
} from '../src/features/editor/utils/editorUtils.js'

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

describe('moveWidget', () => {
  const sections = () => [
    { id: 's1', title: 'A', widgets: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] },
    { id: 's2', title: 'B', widgets: [{ id: 'w4' }] },
    { id: 's3', title: 'C', widgets: [] },
  ]
  const ids = (result, sectionId) => result.find((s) => s.id === sectionId).widgets.map((w) => w.id)

  it('reorders within a section like a drop onto that row', () => {
    const before = sections()
    const after = moveWidget(before, { sectionId: 's1', index: 0 }, { sectionId: 's1', index: 2 })
    expect(ids(after, 's1')).toEqual(['w2', 'w3', 'w1'])
    expect(before[0].widgets.map((w) => w.id)).toEqual(['w1', 'w2', 'w3'])
  })

  it('moves a widget into another section at the drop index', () => {
    const after = moveWidget(sections(), { sectionId: 's1', index: 1 }, { sectionId: 's2', index: 0 })
    expect(ids(after, 's1')).toEqual(['w1', 'w3'])
    expect(ids(after, 's2')).toEqual(['w2', 'w4'])
  })

  it('appends when the target index is past the end (drop on empty space)', () => {
    const after = moveWidget(sections(), { sectionId: 's1', index: 0 }, { sectionId: 's3', index: 0 })
    expect(ids(after, 's3')).toEqual(['w1'])
    const appended = moveWidget(sections(), { sectionId: 's2', index: 0 }, { sectionId: 's1', index: 99 })
    expect(ids(appended, 's1')).toEqual(['w1', 'w2', 'w3', 'w4'])
  })

  it('leaves untouched sections identical and no-ops on an unknown source', () => {
    const before = sections()
    const after = moveWidget(before, { sectionId: 's1', index: 0 }, { sectionId: 's2', index: 0 })
    expect(after[2]).toBe(before[2])
    expect(moveWidget(before, { sectionId: 'nope', index: 0 }, { sectionId: 's1', index: 0 })).toBe(before)
    expect(moveWidget(before, { sectionId: 's1', index: 9 }, { sectionId: 's1', index: 0 })).toBe(before)
    expect(moveWidget(before, { sectionId: 's1', index: 1 }, { sectionId: 's1', index: 1 })).toBe(before)
  })

  it('does not remove the widget when the destination section is unknown', () => {
    const before = sections()
    expect(moveWidget(before, { sectionId: 's1', index: 0 }, { sectionId: 'nope', index: 0 })).toBe(before)
    expect(ids(before, 's1')).toEqual(['w1', 'w2', 'w3'])
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
