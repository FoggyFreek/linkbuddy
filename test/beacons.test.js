import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/app.js'

const PAGE = {
  id: 1,
  slug: 'thewoods',
  page_type: 'main',
  published_layout: { sections: [] },
  content: {},
  release: null,
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

let inserts

function makePool(pages = [PAGE]) {
  return {
    query: async (sql, params = []) => {
      if (sql.startsWith('SELECT * FROM pages WHERE slug')) {
        return { rows: pages.filter((p) => p.slug === params[0]) }
      }
      if (sql.includes('INSERT INTO page_views')) {
        inserts.push({ table: 'views', params })
        return { rows: [] }
      }
      if (sql.includes('INSERT INTO page_clicks')) {
        inserts.push({ table: 'clicks', params })
        return { rows: [] }
      }
      return { rows: [] }
    },
  }
}

beforeEach(() => {
  inserts = []
})

describe('view and click beacons', () => {
  it('records a view against the published page', async () => {
    const app = createApp(makePool())
    await request(app).post('/api/pages/thewoods/view').set('user-agent', CHROME_UA).expect(204)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].table).toBe('views')
    expect(inserts[0].params[0]).toBe(PAGE.id)
  })

  it('stores only coarse anonymous dimensions — never the IP or user agent', () => {
    // page_id, device, source, country, visitor_hash.
    return request(createApp(makePool()))
      .post('/api/pages/thewoods/view')
      .set('user-agent', CHROME_UA)
      .set('x-forwarded-for', '203.0.113.9')
      .expect(204)
      .then(() => {
        const [, device, source, country, hash] = inserts[0].params
        expect(device).toBe('desktop')
        expect(source).toBe('direct')
        expect(country).toBe('unknown')
        expect(JSON.stringify(inserts[0].params)).not.toContain('203.0.113.9')
        expect(JSON.stringify(inserts[0].params)).not.toContain('Mozilla')
        expect(typeof hash).toBe('string')
      })
  })

  it('classifies the device from the user agent', async () => {
    const app = createApp(makePool())
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
    await request(app).post('/api/pages/thewoods/view').set('user-agent', iphone).expect(204)
    expect(inserts[0].params[1]).toBe('mobile')
  })

  it('drops bot traffic without recording anything', async () => {
    const app = createApp(makePool())
    await request(app).post('/api/pages/thewoods/view').set('user-agent', 'Googlebot/2.1').expect(204)
    expect(inserts).toHaveLength(0)
  })

  it('takes the referrer and utm source from the body when present', async () => {
    const app = createApp(makePool())
    await request(app)
      .post('/api/pages/thewoods/view')
      .set('user-agent', CHROME_UA)
      .send({ referrer: 'https://www.instagram.com/', utmSource: null })
      .expect(204)
    // Hostname only, www stripped — never the referrer's path or query.
    expect(inserts[0].params[2]).toBe('instagram.com')
  })

  it('records a click with its sanitized target', async () => {
    const app = createApp(makePool())
    await request(app)
      .post('/api/pages/thewoods/click')
      .set('user-agent', CHROME_UA)
      .send({ target: 'platform:spotify' })
      .expect(204)
    expect(inserts[0].table).toBe('clicks')
    expect(inserts[0].params[1]).toBe('platform:spotify')
  })

  it('accepts beacons on a release path as well as a main one', async () => {
    const release = { ...PAGE, id: 2, slug: 'thewoods/sun', page_type: 'release' }
    const app = createApp(makePool([PAGE, release]))
    await request(app).post('/api/pages/thewoods/sun/view').set('user-agent', CHROME_UA).expect(204)
    expect(inserts[0].params[0]).toBe(2)
  })

  it('stays 204 but records nothing for unknown, unpublished or disabled pages', async () => {
    const unpublished = { ...PAGE, slug: 'draft', published_layout: null }
    const lapsed = { ...PAGE, slug: 'lapsed', content: { entitlements: { enabled: false } } }
    const app = createApp(makePool([PAGE, unpublished, lapsed]))
    for (const slug of ['nosuchband', 'draft', 'lapsed', '-malformed']) {
      await request(app).post(`/api/pages/${slug}/view`).set('user-agent', CHROME_UA).expect(204)
    }
    expect(inserts).toHaveLength(0)
  })
})
