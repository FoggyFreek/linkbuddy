import { describe, it, expect } from 'vitest'
import { makeWidget, widgetSummary } from '../src/features/editor/utils/widgetModel.js'

const CONTENT = {
  songs: [{ id: 3, title: 'Midnight Signal' }],
  products: [{ id: 9 }, { id: 10 }],
}

describe('makeWidget', () => {
  it('seeds song and platforms widgets from the first song', () => {
    expect(makeWidget('song', CONTENT)).toMatchObject({ type: 'song', songId: 3 })
    expect(makeWidget('platforms', CONTENT)).toMatchObject({ type: 'platforms', songId: 3, title: null })
  })

  it('seeds a merch widget with every product', () => {
    expect(makeWidget('merch', CONTENT).items).toEqual([
      { productId: 9, imageUrl: null, badge: null },
      { productId: 10, imageUrl: null, badge: null },
    ])
  })

  it('returns null when the content a widget needs is missing', () => {
    expect(makeWidget('song', {})).toBeNull()
    expect(makeWidget('platforms', {})).toBeNull()
    expect(makeWidget('merch', { products: [] })).toBeNull()
    expect(makeWidget('iframe', CONTENT)).toBeNull()
  })

  it('creates content-free widgets without any content', () => {
    expect(makeWidget('gigs', {})).toMatchObject({ type: 'gigs', limit: 10 })
    expect(makeWidget('link', {})).toMatchObject({ type: 'link', label: '', icon: 'globe' })
    expect(makeWidget('embed', {})).toMatchObject({ type: 'embed', url: '' })
  })

  it('gives every widget its own id', () => {
    expect(makeWidget('gigs', {}).id).not.toBe(makeWidget('gigs', {}).id)
  })
})

describe('widgetSummary', () => {
  it('labels content-backed widgets by song title', () => {
    expect(widgetSummary({ type: 'song', songId: 3 }, CONTENT)).toBe('Song · Midnight Signal')
    expect(widgetSummary({ type: 'platforms', songId: 3 }, CONTENT)).toBe('Platform buttons · Midnight Signal')
  })

  it('says so when the referenced song is gone', () => {
    expect(widgetSummary({ type: 'song', songId: 99 }, CONTENT)).toBe('Song · missing song')
    expect(widgetSummary({ type: 'platforms', songId: 3 }, {})).toBe('Platform buttons · missing song')
  })

  it('falls back through title, url and a count', () => {
    expect(widgetSummary({ type: 'gigs' }, CONTENT)).toBe('Gigs · Upcoming Gigs')
    expect(widgetSummary({ type: 'merch', items: [{}, {}] }, CONTENT)).toBe('Merch · 2 products')
    expect(widgetSummary({ type: 'merch', title: 'CDs', items: [{}] }, CONTENT)).toBe('Merch · CDs')
    expect(widgetSummary({ type: 'link', url: 'https://x.example' }, CONTENT)).toBe('Custom link · https://x.example')
    expect(widgetSummary({ type: 'embed' }, CONTENT)).toBe('Embed · new')
    expect(widgetSummary({ type: 'iframe' }, CONTENT)).toBe('iframe')
  })
})
