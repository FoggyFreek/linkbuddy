// SQL for the pages table. Every function takes the executor first so
// callers stay in control of transactions.

export async function getPageBySlug(executor, slug) {
  const { rows } = await executor.query('SELECT * FROM pages WHERE slug = $1', [slug])
  return rows[0] || null
}

// Tenant-scoped id lookup: a session for band A must never load band B's
// page, so the tenant id is part of the WHERE, not an afterthought.
export async function getPageForTenant(executor, pageId, tenantId) {
  const { rows } = await executor.query(
    'SELECT * FROM pages WHERE id = $1 AND gigbuddy_tenant_id = $2',
    [pageId, tenantId],
  )
  return rows[0] || null
}

export async function listPagesForTenant(executor, tenantId) {
  const { rows } = await executor.query(
    `SELECT id, slug, page_type, release, published_at
       FROM pages
      WHERE gigbuddy_tenant_id = $1
      ORDER BY (page_type = 'main') DESC, created_at ASC`,
    [tenantId],
  )
  return rows
}

export async function getMainPageForTenant(executor, tenantId) {
  const { rows } = await executor.query(
    `SELECT * FROM pages
      WHERE gigbuddy_tenant_id = $1 AND page_type = 'main'`,
    [tenantId],
  )
  return rows[0] || null
}

// Release landing page. Returns null on a slug collision (caller turns that
// into a 409) instead of throwing.
export async function insertReleasePage(
  executor,
  slug,
  tenantId,
  release,
  layout,
  content,
  mainSlug,
  slugRevision,
) {
  const { rows } = await executor.query(
    `INSERT INTO pages (slug, gigbuddy_tenant_id, page_type, release, draft_layout, content, content_synced_at)
     SELECT $1, $2, 'release', $3, $4, $5, NOW()
       FROM gigbuddy_tenant_namespaces
      WHERE gigbuddy_tenant_id = $2
        AND main_slug = $6
        AND ($7::bigint IS NULL OR slug_revision = $7)
      FOR SHARE
     ON CONFLICT (slug) DO NOTHING
     RETURNING *`,
    [
      slug,
      tenantId,
      JSON.stringify(release),
      JSON.stringify(layout),
      JSON.stringify(content),
      mainSlug,
      Number.isSafeInteger(slugRevision) ? slugRevision : null,
    ],
  )
  return rows[0] || null
}

// Only release pages can be deleted — the main page is the band's anchor.
export async function deleteReleasePage(executor, pageId, tenantId) {
  const { rowCount } = await executor.query(
    `DELETE FROM pages WHERE id = $1 AND gigbuddy_tenant_id = $2 AND page_type = 'release'`,
    [pageId, tenantId],
  )
  return rowCount > 0
}

export async function saveDraftLayout(executor, pageId, layout) {
  await executor.query(
    'UPDATE pages SET draft_layout = $2, updated_at = NOW() WHERE id = $1',
    [pageId, JSON.stringify(layout)],
  )
}

export async function publishDraft(executor, pageId) {
  const { rows } = await executor.query(
    `UPDATE pages
        SET published_layout = draft_layout, published_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [pageId],
  )
  return rows[0] || null
}

export async function unpublish(executor, pageId) {
  await executor.query(
    'UPDATE pages SET published_layout = NULL, published_at = NULL, updated_at = NOW() WHERE id = $1',
    [pageId],
  )
}

export async function saveContentForNamespace(
  executor,
  pageId,
  tenantId,
  mainSlug,
  slugRevision,
  content,
) {
  const { rows } = await executor.query(
    `WITH current_namespace AS MATERIALIZED (
       SELECT gigbuddy_tenant_id
         FROM gigbuddy_tenant_namespaces
        WHERE gigbuddy_tenant_id = $2
          AND main_slug = $3
          AND ($4::bigint IS NULL OR slug_revision = $4)
        FOR SHARE
     )
     UPDATE pages
        SET content = $5, content_synced_at = NOW(), updated_at = NOW()
       FROM current_namespace
      WHERE pages.id = $1
        AND pages.gigbuddy_tenant_id = current_namespace.gigbuddy_tenant_id
     RETURNING pages.*`,
    [
      pageId,
      tenantId,
      mainSlug,
      Number.isSafeInteger(slugRevision) ? slugRevision : null,
      JSON.stringify(content),
    ],
  )
  return rows[0] || null
}
