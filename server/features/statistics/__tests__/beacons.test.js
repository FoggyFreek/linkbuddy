import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { configureCredentials } from '../../../__tests__/credentials.js'

beforeAll(configureCredentials)

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

afterEach(() => {
  delete process.env.STATS_COUNTRY_HEADER
  delete process.env.TRUST_PROXY_HOPS
})

const view = (app, headers = {}) => {
  const req = request(app).post('/api/pages/thewoods/view').set('user-agent', CHROME_UA)
  for (const [name, value] of Object.entries(headers)) req.set(name, value)
  return req
}

describe('beacon trust boundaries', () => {
  it('takes the visitor address from the proxy hop, not from spoofable forwarded entries', async () => {
    const app = createApp(makePool())
    await view(app, { 'x-forwarded-for': '198.51.100.1, 203.0.113.9' }).expect(204)
    await view(app, { 'x-forwarded-for': '198.51.100.2, 203.0.113.9' }).expect(204)
    await view(app, { 'x-forwarded-for': '198.51.100.1, 203.0.113.10' }).expect(204)

    const hashes = inserts.map((insert) => insert.params[4])
    expect(hashes[0]).toBe(hashes[1])
    expect(hashes[2]).not.toBe(hashes[0])
  })

  it('reads the country only from the configured proxy header', async () => {
    process.env.STATS_COUNTRY_HEADER = 'x-country-code'
    const app = createApp(makePool())
    await view(app, { 'cf-ipcountry': 'DE', 'x-country-code': 'nl' }).expect(204)
    delete process.env.STATS_COUNTRY_HEADER
    await view(app, { 'cf-ipcountry': 'DE', 'x-country-code': 'nl' }).expect(204)

    expect(inserts.map((insert) => insert.params[3])).toEqual(['NL', 'unknown'])
  })

  it('throttles one visitor without affecting another', async () => {
    const app = createApp(makePool())
    const statuses = []
    for (let i = 0; i < 61; i++) {
      statuses.push((await view(app, { 'x-forwarded-for': `198.51.100.${i}, 203.0.113.9` })).status)
    }

    expect(statuses.slice(0, 60).every((status) => status === 204)).toBe(true)
    expect(statuses[60]).toBe(429)
    expect(inserts).toHaveLength(60)
    await view(app, { 'x-forwarded-for': '203.0.113.10' }).expect(204)
    expect(inserts).toHaveLength(61)
  })
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

  it('records a click on a link whose label has punctuation', async () => {
    const app = createApp(makePool())
    await request(app)
      .post('/api/pages/thewoods/click')
      .set('user-agent', CHROME_UA)
      .send({ target: 'link:Pre-save (Spotify)' })
      .expect(204)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].params[1]).toBe('link:pre-save spotify')
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
