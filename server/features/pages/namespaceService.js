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
    return await transaction(pool, async (client) => {
      let namespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
      let pages = await repo.lockTenantPages(client, tenantId)
      let { main } = inspectPages(pages, slug)

      if (!namespace) {
        const initialSlug = main?.slug || slug
        const initialRevision = main ? 0 : (versioned ? slugRevision : 0)
        await assertTargetsAvailable(client, repo, tenantId, initialSlug)
        namespace = await repo.insertTenantNamespace(client, tenantId, initialSlug, initialRevision)
        if (!namespace) namespace = await repo.getTenantNamespaceForUpdate(client, tenantId)
      }

      let currentRevision = revisionOf(namespace)
      if (!versioned) {
        if (namespace.main_slug !== slug) {
          throw new NamespaceError('namespace_sync_required', 'Legacy handoff does not match current namespace')
        }
      } else if (slugRevision < currentRevision) {
        throw new NamespaceError('namespace_sync_required', 'Handoff revision is stale')
      } else if (slugRevision === currentRevision) {
        if (namespace.main_slug !== slug) {
          throw new NamespaceError('revision_conflict', 'Handoff revision has a different slug')
        }
      } else {
        const migrated = await applyNextRevision(
          client,
          repo,
          namespace,
          pages,
          tenantId,
          slug,
          slugRevision,
        )
        namespace = migrated.namespace
        currentRevision = revisionOf(namespace)
        if (migrated.code === 'applied') {
          pages = pages.map((page) => ({
            ...page,
            slug: page.page_type === 'main' ? slug : `${slug}/${releaseTail(page.slug)}`,
          }))
          main = pages.find((page) => page.page_type === 'main') || null
        }
      }

      if (!main) {
        const page = await repo.insertTenantMainPage(client, namespace.main_slug, tenantId)
        if (!page) throw new NamespaceError('slug_conflict', 'Main page path is already in use')
        main = page
      } else if (main.slug !== namespace.main_slug) {
        throw new NamespaceError('invalid_namespace', 'Main page and namespace do not match')
      }

      return {
        page: main,
        mainSlug: namespace.main_slug,
        slugRevision: currentRevision,
      }
    })
  } catch (error) {
    throw mapUniqueViolation(error)
  }
}
