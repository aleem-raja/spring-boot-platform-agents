# Flyway

## Purpose

Manage database schema migrations with version-controlled, repeatable scripts for PostgreSQL (and other databases).

## When to Use

- Default migration tool for Spring Boot services using PostgreSQL.
- Use for all schema changes: tables, indexes, views, functions, stored procedures.
- Use for data migrations (backfill, transform, seed).

## Best Practices

- Use versioned migrations with naming convention: `V<major>__<description>.sql`.
  - Example: `V1__create_customer_table.sql`, `V2__add_email_index.sql`.
- Use repeatable migrations for views and functions: `R__<description>.sql`.
  - Example: `R__customer_search_view.sql`.
- Migration files go in `src/main/resources/db/migration/`.
- Keep migrations idempotent: use `IF NOT EXISTS`, `CREATE OR REPLACE`.
- Never modify a migration that has been applied to production. Create a new migration.
- Test migrations with Testcontainers in CI — every migration must be validated against a real PostgreSQL instance.
- Use `flyway.clean-disabled: true` in production to prevent accidental clean.
- Use `flyway.baseline-on-migrate: true` when introducing Flyway to an existing database.

## Anti-Patterns

- Editing committed migration files — create `V2` instead of editing `V1`.
- Multiple developers creating migrations with the same version number — use timestamp-based versioning if conflicts are common.
- SQL migrations that depend on application code — views and functions that reference Java enums or class names.
- Running migrations manually on production — must go through CI/CD.
- Uncommitted SQL files in the migration directory — every file must be version-controlled.

## Examples

**V1__create_customer_table.sql:**
```sql
CREATE TABLE customer (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_created_at ON customer(created_at);
```

**V2__add_address_columns.sql:**
```sql
ALTER TABLE customer ADD COLUMN address_line1 VARCHAR(255);
ALTER TABLE customer ADD COLUMN address_city VARCHAR(100);
ALTER TABLE customer ADD COLUMN address_postal_code VARCHAR(20);
ALTER TABLE customer ADD COLUMN address_country VARCHAR(3);
```
