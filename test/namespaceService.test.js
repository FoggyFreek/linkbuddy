import { describe, expect, it } from 'vitest'
import {
  ensureTenantMainPage,
  migrateTenantNamespace,
  NamespaceError,
} from '../server/namespaceService.js'

function page(id, slug, tenantId, pageType = 'main') {
  return {
    id,
    slug,
    gigbuddy_tenant_id: tenantId,
    page_type: pageType,
    release: pageType === 'release' ? { songId: id, title: `Release ${id}` } : null,
    draft_layout: { sections: [{ id: `draft-${id}`, widgets: [] }] },
    published_layout: { sections: [{ id: `published-${id}`, widgets: [] }] },
    content: { marker: id },
    content_synced_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-02T00:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2026-01-03T00:00:00.000Z',
  }
}

function harness(initial = {}) {
  const state = {
    pages: structuredClone(initial.pages || []),
    namespaces: structuredClone(initial.namespaces || []),
    views: structuredClone(initial.views || []),
    clicks: structuredClone(initial.clicks || []),
  }
  let snapshot
  const restore = (key) => state[key].splice(0, state[key].length, ...structuredClone(snapshot[key]))
  const client = {
    query: async (sql) => {
      if (sql === 'BEGIN') snapshot = structuredClone(state)
      if (sql === 'ROLLBACK') {
        restore('pages')
        restore('namespaces')
        restore('views')
        restore('clicks')
      }
      return { rows: [] }
    },
    release() {},
  }
  const pool = { connect: async () => client }
  const repo = {
    getTenantNamespaceForUpdate: async (_executor, tenantId) =>
      state.namespaces.find((row) => row.gigbuddy_tenant_id === tenantId) || null,
    insertTenantNamespace: async (_executor, tenantId, mainSlug, slugRevision) => {
      if (state.namespaces.some((row) => row.gigbuddy_tenant_id === tenantId)) return null
      if (state.namespaces.some((row) => row.main_slug === mainSlug)) throw Object.assign(new Error('unique'), { code: '23505' })
      const row = { gigbuddy_tenant_id: tenantId, main_slug: mainSlug, slug_revision: slugRevision }
      state.namespaces.push(row)
      return row
    },
    lockTenantPages: async (_executor, tenantId) =>
      state.pages.filter((row) => row.gigbuddy_tenant_id === tenantId),
    findNamespaceOwnerForUpdate: async (_executor, mainSlug, tenantId) =>
      state.namespaces.find(
        (row) => row.main_slug === mainSlug && row.gigbuddy_tenant_id !== tenantId,
      ) || null,
    findForeignPageInNamespace: async (_executor, tenantId, mainSlug) =>
      state.pages.find(
        (row) => row.gigbuddy_tenant_id !== tenantId &&
          (row.slug === mainSlug || row.slug.startsWith(`${mainSlug}/`)),
      ) || null,
    renameTenantPages: async (_executor, tenantId, newSlug) => {
      for (const row of state.pages.filter((candidate) => candidate.gigbuddy_tenant_id === tenantId)) {
        row.slug = row.page_type === 'main' ? newSlug : `${newSlug}/${row.slug.split('/')[1]}`
        row.updated_at = 'changed'
      }
    },
    updateTenantNamespace: async (_executor, tenantId, mainSlug, slugRevision) => {
      const row = state.namespaces.find((candidate) => candidate.gigbuddy_tenant_id === tenantId)
      if (state.namespaces.some(
        (candidate) => candidate.main_slug === mainSlug && candidate.gigbuddy_tenant_id !== tenantId,
      )) throw Object.assign(new Error('unique'), { code: '23505' })
      row.main_slug = mainSlug
      row.slug_revision = slugRevision
      return row
    },
    insertTenantMainPage: async (_executor, slug, tenantId) => {
      if (state.pages.some((row) => row.slug === slug)) return null
      if (state.pages.some((row) => row.gigbuddy_tenant_id === tenantId && row.page_type === 'main')) {
        throw Object.assign(new Error('one main'), { code: '23505' })
      }
      const row = page(Math.max(0, ...state.pages.map((candidate) => candidate.id)) + 1, slug, tenantId)
      state.pages.push(row)
      return row
    },
  }
  return { state, pool, repo }
}

describe('tenant namespace migration', () => {
  it('atomically renames the main page and every release while preserving IDs and data', async () => {
    const originalPages = [page(10, 'old-band', 7), page(11, 'old-band/first', 7, 'release'), page(12, 'old-band/second', 7, 'release')]
    const { state, pool, repo } = harness({
      pages: originalPages,
      namespaces: [{ gigbuddy_tenant_id: 7, main_slug: 'old-band', slug_revision: 0 }],
      views: [{ page_id: 10 }, { page_id: 11 }],
      clicks: [{ page_id: 12 }],
    })

    const result = await migrateTenantNamespace(pool, {
      tenantId: 7,
      newSlug: 'new-band',
      revision: 1,
    }, repo)

    expect(result.code).toBe('applied')
    expect(state.pages.map((row) => [row.id, row.slug])).toEqual([
      [10, 'new-band'],
      [11, 'new-band/first'],
      [12, 'new-band/second'],
    ])
    for (const row of state.pages) {
      const original = originalPages.find((candidate) => candidate.id === row.id)
      expect(row).toMatchObject({
        id: original.id,
        release: original.release,
        draft_layout: original.draft_layout,
        published_layout: original.published_layout,
        content: original.content,
        content_synced_at: original.content_synced_at,
        published_at: original.published_at,
        created_at: original.created_at,
      })
    }
    expect(state.views).toEqual([{ page_id: 10 }, { page_id: 11 }])
    expect(state.clicks).toEqual([{ page_id: 12 }])
    expect(state.namespaces[0]).toMatchObject({ main_slug: 'new-band', slug_revision: 1 })
  })

  it('rolls back every path and the revision when a foreign target collides', async () => {
    const { state, pool, repo } = harness({
      pages: [page(1, 'old', 1), page(2, 'old/single', 1, 'release'), page(3, 'new/single', 2, 'release')],
      namespaces: [
        { gigbuddy_tenant_id: 1, main_slug: 'old', slug_revision: 0 },
        { gigbuddy_tenant_id: 2, main_slug: 'other', slug_revision: 0 },
      ],
    })
    const before = structuredClone(state)

    await expect(migrateTenantNamespace(pool, {
      tenantId: 1,
      newSlug: 'new',
      revision: 1,
    }, repo)).rejects.toMatchObject({ code: 'slug_conflict' })
    expect(state).toEqual(before)
  })

  it('handles duplicate, stale, conflicting, and gapped revisions deterministically', async () => {
    const { state, pool, repo } = harness({
      pages: [page(1, 'current', 1)],
      namespaces: [{ gigbuddy_tenant_id: 1, main_slug: 'current', slug_revision: 3 }],
    })

    await expect(migrateTenantNamespace(pool, { tenantId: 1, newSlug: 'current', revision: 3 }, repo))
      .resolves.toMatchObject({ code: 'already_applied' })
    await expect(migrateTenantNamespace(pool, { tenantId: 1, newSlug: 'older', revision: 2 }, repo))
      .resolves.toMatchObject({ code: 'stale_ignored' })
    await expect(migrateTenantNamespace(pool, { tenantId: 1, newSlug: 'different', revision: 3 }, repo))
      .rejects.toMatchObject({ code: 'revision_conflict' })
    await expect(migrateTenantNamespace(pool, { tenantId: 1, newSlug: 'future', revision: 5 }, repo))
      .rejects.toMatchObject({ code: 'revision_gap' })
    expect(state.pages[0].slug).toBe('current')
  })

  it('records the namespace revision without creating a page', async () => {
    const { state, pool, repo } = harness()
    const result = await migrateTenantNamespace(pool, {
      tenantId: 9,
      newSlug: 'page-less',
      revision: 1,
    }, repo)
    expect(result.code).toBe('no_pages')
    expect(state.pages).toEqual([])
    expect(state.namespaces).toEqual([
      { gigbuddy_tenant_id: 9, main_slug: 'page-less', slug_revision: 1 },
    ])
  })

  it('rejects an initial no-page command with a missing earlier revision', async () => {
    const { state, pool, repo } = harness()
    await expect(migrateTenantNamespace(pool, {
      tenantId: 9,
      newSlug: 'page-less',
      revision: 2,
    }, repo)).rejects.toMatchObject({ code: 'revision_gap' })
    expect(state).toEqual({ pages: [], namespaces: [], views: [], clicks: [] })
  })

  it('rejects malformed release state without changing anything', async () => {
    const { state, pool, repo } = harness({
      pages: [page(1, 'old', 1), page(2, 'malformed', 1, 'release')],
      namespaces: [{ gigbuddy_tenant_id: 1, main_slug: 'old', slug_revision: 0 }],
    })
    const before = structuredClone(state)
    await expect(migrateTenantNamespace(pool, {
      tenantId: 1,
      newSlug: 'new',
      revision: 1,
    }, repo)).rejects.toMatchObject({ code: 'invalid_namespace' })
    expect(state).toEqual(before)
  })
})

describe('editor handoff namespace repair', () => {
  it('creates and then reuses one tenant main page', async () => {
    const { state, pool, repo } = harness()
    const first = await ensureTenantMainPage(pool, { tenantId: 5, slug: 'band', slugRevision: 2 }, repo)
    const second = await ensureTenantMainPage(pool, { tenantId: 5, slug: 'band', slugRevision: 2 }, repo)
    expect(second.page.id).toBe(first.page.id)
    expect(state.pages.filter((row) => row.page_type === 'main')).toHaveLength(1)
    expect(second).toMatchObject({ mainSlug: 'band', slugRevision: 2 })
  })

  it('repairs a changed slug only with the next versioned handoff', async () => {
    const { state, pool, repo } = harness({
      pages: [page(1, 'old', 1), page(2, 'old/song', 1, 'release')],
      namespaces: [{ gigbuddy_tenant_id: 1, main_slug: 'old', slug_revision: 6 }],
    })
    const result = await ensureTenantMainPage(pool, {
      tenantId: 1,
      slug: 'new',
      slugRevision: 7,
    }, repo)
    expect(result).toMatchObject({ mainSlug: 'new', slugRevision: 7 })
    expect(state.pages.map((row) => row.slug)).toEqual(['new', 'new/song'])
  })

  it('does not let an unversioned legacy handoff rename newer namespace state', async () => {
    const { state, pool, repo } = harness({
      pages: [page(1, 'current', 1)],
      namespaces: [{ gigbuddy_tenant_id: 1, main_slug: 'current', slug_revision: 8 }],
    })
    await expect(ensureTenantMainPage(pool, { tenantId: 1, slug: 'old' }, repo))
      .rejects.toBeInstanceOf(NamespaceError)
    expect(state.pages[0].slug).toBe('current')
    expect(state.namespaces[0].slug_revision).toBe(8)
  })
})
