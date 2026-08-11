-- Refuse to guess which legacy main page owns a tenant. Operators must audit
-- and resolve these rows before this migration can safely add the invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pages
     WHERE page_type = 'main'
     GROUP BY gigbuddy_tenant_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'cannot migrate: tenants with multiple main LinkBuddy pages exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pages release_page
     WHERE release_page.page_type = 'release'
       AND (
         release_page.slug !~ '^[a-z0-9][a-z0-9-]{0,80}/[a-z0-9][a-z0-9-]{0,60}$'
         OR NOT EXISTS (
           SELECT 1
             FROM pages main_page
            WHERE main_page.gigbuddy_tenant_id = release_page.gigbuddy_tenant_id
              AND main_page.page_type = 'main'
         )
       )
  ) THEN
    RAISE EXCEPTION 'cannot migrate: malformed or orphaned LinkBuddy release paths exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX pages_one_main_per_tenant_idx
ON pages (gigbuddy_tenant_id)
WHERE page_type = 'main';

CREATE TABLE gigbuddy_tenant_namespaces (
  gigbuddy_tenant_id  INTEGER PRIMARY KEY,
  main_slug           TEXT UNIQUE NOT NULL CHECK (main_slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  slug_revision       BIGINT NOT NULL DEFAULT 0 CHECK (slug_revision >= 0),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gigbuddy_tenant_namespaces (gigbuddy_tenant_id, main_slug, slug_revision)
SELECT gigbuddy_tenant_id, slug, 0
  FROM pages
 WHERE page_type = 'main';
