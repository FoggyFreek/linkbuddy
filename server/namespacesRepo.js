// SQL primitives for tenant-owned public namespaces. Callers own transaction
// boundaries so integration delivery and handoff repair share one atomic path.

export async function getTenantNamespace(executor, tenantId) {
  const { rows } = await executor.query(
    'SELECT * FROM gigbuddy_tenant_namespaces WHERE gigbuddy_tenant_id = $1',
    [tenantId],
  )
  return rows[0] || null
}

export async function getTenantNamespaceForUpdate(executor, tenantId) {
  const { rows } = await executor.query(
    'SELECT * FROM gigbuddy_tenant_namespaces WHERE gigbuddy_tenant_id = $1 FOR UPDATE',
    [tenantId],
  )
  return rows[0] || null
}

export async function insertTenantNamespace(executor, tenantId, mainSlug, slugRevision) {
  const { rows } = await executor.query(
    `INSERT INTO gigbuddy_tenant_namespaces (gigbuddy_tenant_id, main_slug, slug_revision)
     VALUES ($1, $2, $3)
     ON CONFLICT (gigbuddy_tenant_id) DO NOTHING
     RETURNING *`,
    [tenantId, mainSlug, slugRevision],
  )
  return rows[0] || null
}

export async function lockTenantPages(executor, tenantId) {
  const { rows } = await executor.query(
    'SELECT * FROM pages WHERE gigbuddy_tenant_id = $1 ORDER BY id FOR UPDATE',
    [tenantId],
  )
  return rows
}

export async function findNamespaceOwnerForUpdate(executor, mainSlug, tenantId) {
  const { rows } = await executor.query(
    `SELECT gigbuddy_tenant_id
       FROM gigbuddy_tenant_namespaces
      WHERE main_slug = $1 AND gigbuddy_tenant_id <> $2
      FOR UPDATE`,
    [mainSlug, tenantId],
  )
  return rows[0] || null
}

export async function findForeignPageInNamespace(executor, tenantId, mainSlug) {
  const { rows } = await executor.query(
    `SELECT slug, gigbuddy_tenant_id
       FROM pages
      WHERE gigbuddy_tenant_id <> $1
        AND (slug = $2 OR slug LIKE $2 || '/%')
      LIMIT 1
      FOR UPDATE`,
    [tenantId, mainSlug],
  )
  return rows[0] || null
}

export async function renameTenantPages(executor, tenantId, newSlug) {
  await executor.query(
    `UPDATE pages
        SET slug = CASE
          WHEN page_type = 'main' THEN $2
          ELSE $2 || substring(slug FROM position('/' IN slug))
        END,
            updated_at = NOW()
      WHERE gigbuddy_tenant_id = $1`,
    [tenantId, newSlug],
  )
}

export async function updateTenantNamespace(executor, tenantId, mainSlug, slugRevision) {
  const { rows } = await executor.query(
    `UPDATE gigbuddy_tenant_namespaces
        SET main_slug = $2, slug_revision = $3, updated_at = NOW()
      WHERE gigbuddy_tenant_id = $1
      RETURNING *`,
    [tenantId, mainSlug, slugRevision],
  )
  return rows[0] || null
}

export async function insertTenantMainPage(executor, slug, tenantId) {
  const { rows } = await executor.query(
    `INSERT INTO pages (slug, gigbuddy_tenant_id, page_type)
     VALUES ($1, $2, 'main')
     ON CONFLICT (slug) DO NOTHING
     RETURNING *`,
    [slug, tenantId],
  )
  return rows[0] || null
}
