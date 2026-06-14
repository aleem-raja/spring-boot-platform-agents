# Liquibase

## Purpose

Manage database schema migrations using Liquibase changelogs (XML, YAML, JSON, or SQL formats) for PostgreSQL and other databases.

## When to Use

- Alternative to Flyway when team prefers declarative migration format or requires rollback support.
- Use when database migrations need to be database-vendor independent.
- Use when rollback scripts are required as part of the deployment process.

## Best Practices

- Use structured changelog files: one master `db.changelog-master.xml` that includes individual changesets.
- Use meaningful `id` and `author` attributes on each changeset for traceability.
- Use `changeset` with `context` filters for environment-specific migrations (seed data for dev, not prod).
- Use `preconditions` to ensure migrations are applied only when necessary.
- Test every changeset with Testcontainers in CI.
- Use `liquibase.rollback-count=1` for safe rollbacks in development.
- Track changelog files in version control with the same branch/tag strategy as application code.

## Anti-Patterns

- Auto-formatting changelog files — they are data-definition code, not configuration.
- Single monolithic changelog file with thousands of changesets — break into logical files by release.
- Changesets that fail silently — always test against a real database.
- Using Liquibase for data migrations without testing rollback paths.
- Mixing DDL and seed data in the same changeset — split into two.

## Examples

**db.changelog-master.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.27.xsd">
    <include file="db/changelog/001-create-customer-table.xml"/>
    <include file="db/changelog/002-add-address-columns.xml"/>
</databaseChangeLog>
```

**001-create-customer-table.xml:**
```xml
<databaseChangeLog xmlns="...">
    <changeSet id="001" author="architect">
        <createTable tableName="customer">
            <column name="id" type="UUID" defaultValueComputed="gen_random_uuid()">
                <constraints primaryKey="true"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="name" type="VARCHAR(255)"/>
            <column name="created_at" type="TIMESTAMP WITH TIME ZONE"
                    defaultValueComputed="now()"/>
        </createTable>
        <createIndex tableName="customer" indexName="idx_customer_email">
            <column name="email"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```
