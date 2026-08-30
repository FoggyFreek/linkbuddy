import { MAIN_SLUG_RE, releaseTail } from './slugs.js'
import * as defaultRepo from './namespacesRepo.js'

export class NamespaceError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'NamespaceError'
    this.code = code
  }
}

function revisionOf(namespace) {
  const revision = Number(namespace.slug_revision)
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new NamespaceError('invalid_namespace', 'Stored namespace revision is invalid')
  }
  return revision
}

function inspectPages(pages, newSlug) {
  const mains = pages.filter((page) => page.page_type === 'main')
  if (mains.length > 1) {
    throw new NamespaceError('invalid_namespace', 'Tenant has multiple main pages')
  }
  if (pages.length > 0 && mains.length === 0) {
    throw new NamespaceError('invalid_namespace', 'Tenant has release pages without a main page')
  }

  const targets = []
  for (const page of pages) {
    if (page.page_type === 'main') {
      targets.push(newSlug)
      continue
    }
    if (page.page_type !== 'release') {
      throw new NamespaceError('invalid_namespace', 'Tenant has an unknown page type')
    }
    const tail = releaseTail(page.slug)
    if (!tail) throw new NamespaceError('invalid_namespace', 'Tenant has a malformed release path')
    targets.push(`${newSlug}/${tail}`)
  }
  if (new Set(targets).size !== targets.length) {
    throw new NamespaceError('invalid_namespace', 'Tenant pages would produce duplicate paths')
  }
  return { main: mains[0] || null, targets }
}

async function transaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function assertTargetsAvailable(client, repo, tenantId, newSlug) {
  const namespaceOwner = await repo.findNamespaceOwnerForUpdate(client, newSlug, tenantId)
  const pageOwner = await repo.findForeignPageInNamespace(client, tenantId, newSlug)
  if (namespaceOwner || pageOwner) {
    throw new NamespaceError('slug_conflict', 'Target namespace is owned by another tenant')
  }
}

async function applyNextRevision(client, repo, namespace, pages, tenantId, newSlug, revision) {
  const currentRevision = revisionOf(namespace)
  if (revision < currentRevision) return { code: 'stale_ignored', namespace }
  if (revision === currentRevision) {
    if (namespace.main_slug === newSlug) return { code: 'already_applied', namespace }
    throw new NamespaceError('revision_conflict', 'Revision is already associated with another slug')
  }
  if (revision !== currentRevision + 1) {
    throw new NamespaceError('revision_gap', 'An earlier namespace revision has not been applied')
  }

  inspectPages(pages, newSlug)
  await assertTargetsAvailable(client, repo, tenantId, newSlug)
  if (pages.length > 0) await repo.renameTenantPages(client, tenantId, newSlug)
  const updated = await repo.updateTenantNamespace(client, tenantId, newSlug, revision)
  return { code: pages.length > 0 ? 'applied' : 'no_pages', namespace: updated }
}

function mapUniqueViolation(error) {
  if (error?.code === '23505') {
    return new NamespaceError('slug_conflict', 'Target namespace is owned by another tenant')
  }
  return error
}

async function getOrCreateHandoffNamespace(client, repo, namespace, main, handoff) {
  if (namespace) return namespace

  const { tenantId, slug, slugRevision } = handoff
  const initialSlug = main?.slug || slug
  const initialRevision = main ? 0 : (slugRevision ?? 0)
  await assertTargetsAvailable(client, repo, tenantId, initialSlug)
  const inserted = await repo.insertTenantNamespace(
    client,
    tenantId,
    initialSlug,
    initialRevision,
  )
  return inserted ?? repo.getTenantNamespaceForUpdate(client, tenantId)
}

function handoffRevisionStatus(namespace, handoff) {
  const { slug, slugRevision } = handoff
  const currentRevision = revisionOf(namespace)
  if (slugRevision === undefined) {
    if (namespace.main_slug !== slug) {
      throw new NamespaceError('namespace_sync_required', 'Legacy handoff does not match current namespace')
    }
    return { currentRevision, migrationRequired: false }
  }
  if (slugRevision < currentRevision) {
    throw new NamespaceError('namespace_sync_required', 'Handoff revision is stale')
  }
  if (slugRevision === currentRevision && namespace.main_slug !== slug) {
    throw new NamespaceError('revision_conflict', 'Handoff revision has a different slug')
  }
  return { currentRevision, migrationRequired: slugRevision > currentRevision }
}

function mainAfterMigration(main, slug, code) {
  if (code !== 'applied') return main
  return { ...main, slug }
}

async function synchronizeHandoffNamespace(client, repo, namespace, pages, main, handoff) {
  const { tenantId, slug, slugRevision } = handoff
  const status = handoffRevisionStatus(namespace, handoff)
  if (!status.migrationRequired) return { namespace, main, currentRevision: status.currentRevision }

  const migrated = await applyNextRevision(
    client,
    repo,
    namespace,
    pages,
    tenantId,
    slug,
    slugRevision,
  )
  return {
    namespace: migrated.namespace,
    main: mainAfterMigration(main, slug, migrated.code),
    currentRevision: revisionOf(migrated.namespace),
  }
}

async function ensureMainPageMatchesNamespace(client, repo, namespace, main, tenantId) {
  if (!main) {
    const page = await repo.insertTenantMainPage(client, namespace.main_slug, tenantId)
    if (!page) throw new NamespaceError('slug_conflict', 'Main page path is already in use')
    return page
  }
  if (main.slug !== namespace.main_slug) {
    throw new NamespaceError('invalid_namespace', 'Main page and namespace do not match')
  }
  return main
}

async function ensureTenantMainPageTransaction(client, repo, handoff) {
  const { tenantId, slug } = handoff
  const existingNamespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
  const pages = await repo.lockTenantPages(client, tenantId)
  const { main } = inspectPages(pages, slug)
  const namespace = await getOrCreateHandoffNamespace(
    client,
    repo,
    existingNamespace,
    main,
    handoff,
  )
  const synchronized = await synchronizeHandoffNamespace(
    client,
    repo,
    namespace,
    pages,
    main,
    handoff,
  )
  const page = await ensureMainPageMatchesNamespace(
    client,
    repo,
    synchronized.namespace,
    synchronized.main,
    tenantId,
  )
  return {
    page,
    mainSlug: synchronized.namespace.main_slug,
    slugRevision: synchronized.currentRevision,
  }
}

export async function migrateTenantNamespace(pool, command, repo = defaultRepo) {
  const { tenantId, newSlug, revision } = command
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new NamespaceError('invalid_request', 'Tenant ID must be a positive integer')
  }
  if (!MAIN_SLUG_RE.test(newSlug)) {
    throw new NamespaceError('invalid_request', 'New slug is invalid')
  }
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    throw new NamespaceError('invalid_request', 'Revision must be a positive integer')
  }

  try {
    return await transaction(pool, async (client) => {
      let namespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
      const pages = await repo.lockTenantPages(client, tenantId)

      if (!namespace) {
        const { main } = inspectPages(pages, newSlug)
        if (!main) {
          if (revision !== 1) {
            throw new NamespaceError('revision_gap', 'An earlier namespace revision has not been applied')
          }
          await assertTargetsAvailable(client, repo, tenantId, newSlug)
          const inserted = await repo.insertTenantNamespace(client, tenantId, newSlug, revision)
          if (inserted) return { code: 'no_pages', namespace: inserted }
          namespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
          return applyNextRevision(client, repo, namespace, pages, tenantId, newSlug, revision)
        }
        namespace = await repo.insertTenantNamespace(client, tenantId, main.slug, 0)
        if (!namespace) namespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
      }

      return applyNextRevision(client, repo, namespace, pages, tenantId, newSlug, revision)
    })
  } catch (error) {
    throw mapUniqueViolation(error)
  }
}

export async function ensureTenantMainPage(pool, handoff, repo = defaultRepo) {
  const { tenantId, slug, slugRevision } = handoff
  const versioned = slugRevision !== undefined
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0 || !MAIN_SLUG_RE.test(slug)) {
    throw new NamespaceError('invalid_request', 'Handoff namespace is invalid')
  }
  if (versioned && (!Number.isSafeInteger(slugRevision) || slugRevision < 0)) {
    throw new NamespaceError('invalid_request', 'Handoff revision is invalid')
  }

  try {
    return await transaction(
      pool,
      (client) => ensureTenantMainPageTransaction(client, repo, handoff),
    )
  } catch (error) {
    throw mapUniqueViolation(error)
  }
}
