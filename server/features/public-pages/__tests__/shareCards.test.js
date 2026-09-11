import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { createApp } from '../../../app.js'

const TEMPLATE = [
  '<!doctype html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="description" content="Band link page" />',
  '    <title>Band Links</title>',
  '  </head>',
  '  <body><div id="root"></div></body>',
  '</html>',
].join('\n')

const BAND = {
  name: 'The Woods',
  bio: 'Folk noise from Utrecht.',
  bannerUrl: 'https://cdn.example/banner.jpg',
}

const MAIN_PAGE = {
  id: 1,
  slug: 'thewoods',
  page_type: 'main',
  published_layout: { sections: [] },
  content: { band: BAND, songs: [] },
  release: null,
  content_synced_at: new Date().toISOString(),
}

const RELEASE_PAGE = {
  id: 2,
  slug: 'thewoods/hollow-ground',
  page_type: 'release',
  published_layout: { sections: [] },
  content: { band: BAND, songs: [{ id: 7, title: 'Hollow Ground', coverUrl: 'https://cdn.example/cover.jpg', links: [] }] },
  release: { songId: 7, title: 'Hollow Ground', artist: 'The Woods' },
  content_synced_at: new Date().toISOString(),
}

const UNPUBLISHED = { ...MAIN_PAGE, id: 3, slug: 'draftband', published_layout: null }

let distDir

beforeAll(() => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkbuddy-dist-'))
  fs.writeFileSync(path.join(distDir, 'index.html'), TEMPLATE)
})

afterAll(() => {
  fs.rmSync(distDir, { recursive: true, force: true })
})

const PAGES = [MAIN_PAGE, RELEASE_PAGE, UNPUBLISHED]

function makePool() {
  return {
    query: async (sql, params = []) => {
      if (sql.startsWith('SELECT * FROM pages WHERE slug')) {
        return { rows: PAGES.filter((p) => p.slug === params[0]) }
      }
      return { rows: [] }
    },
  }
}

let previousPublicUrl

beforeEach(() => {
  previousPublicUrl = process.env.LINKPAGE_PUBLIC_URL
  process.env.LINKPAGE_PUBLIC_URL = 'https://links.example'
})

afterEach(() => {
  if (previousPublicUrl === undefined) delete process.env.LINKPAGE_PUBLIC_URL
  else process.env.LINKPAGE_PUBLIC_URL = previousPublicUrl
})

function app() {
  return createApp(makePool(), { distDir })
}

describe('share cards on the served HTML', () => {
  it('describes a band page to a crawler that never runs the bundle', async () => {
    const res = await request(app()).get('/thewoods').expect(200)
    expect(res.text).toContain('<title>The Woods</title>')
    expect(res.text).toContain('<meta property="og:title" content="The Woods" />')
    expect(res.text).toContain('<meta property="og:description" content="Folk noise from Utrecht." />')
    expect(res.text).toContain('<meta property="og:image" content="https://cdn.example/banner.jpg" />')
    expect(res.text).toContain('<meta property="og:url" content="https://links.example/thewoods" />')
    expect(res.text).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(res.text).not.toContain('Band link page')
  })

  it('describes a release page by its own title and cover art', async () => {
    const res = await request(app()).get('/thewoods/hollow-ground').expect(200)
    expect(res.text).toContain('<title>Hollow Ground — The Woods</title>')
    expect(res.text).toContain('<meta property="og:image" content="https://cdn.example/cover.jpg" />')
    expect(res.text).toContain('<meta property="og:type" content="music.song" />')
    expect(res.text).toContain('<meta property="og:url" content="https://links.example/thewoods/hollow-ground" />')
  })

  it('serves the untouched shell for an unknown slug', async () => {
    const res = await request(app()).get('/nobody-here').expect(200)
    expect(res.text).toBe(TEMPLATE)
  })

  it('serves the untouched shell for an unpublished page', async () => {
    const res = await request(app()).get('/draftband').expect(200)
    expect(res.text).toBe(TEMPLATE)
  })

  it('serves the untouched shell for the editor and privacy routes', async () => {
    for (const route of ['/edit', '/privacy', '/']) {
      const res = await request(app()).get(route).expect(200)
      expect(res.text).toBe(TEMPLATE)
    }
  })

  it('still answers the API rather than the shell', async () => {
    await request(app()).get('/api/health').expect(200, { status: 'ok' })
  })

  it('does not record a view for the crawler fetching the HTML', async () => {
    let inserts = 0
    const pool = makePool()
    const wrapped = {
      query: async (sql, params) => {
        if (sql.includes('INSERT INTO page_views')) inserts += 1
        return pool.query(sql, params)
      },
    }
    await request(createApp(wrapped, { distDir })).get('/thewoods').expect(200)
    expect(inserts).toBe(0)
  })
})
