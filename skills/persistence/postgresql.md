# PostgreSQL

## Purpose

Design and optimize PostgreSQL data access for Spring Boot services using JPA, R2DBC, or JDBC.

## When to Use

- Default relational database for all Spring Boot services.
- Use for OLTP workloads requiring ACID transactions.
- Use PGVector extension for vector embeddings when AI features require semantic search.

## Best Practices

- Use UUID primary keys (auto-generated via `gen_random_uuid()`) for distributed-friendliness.
- Use `TIMESTAMP WITH TIME ZONE` for all timestamp columns — store in UTC, convert on display.
- Add indexes on all foreign key columns and columns used in WHERE, ORDER BY, JOIN predicates.
- Use `EXPLAIN ANALYZE` to verify query plans before deploying schema changes.
- Prefer composite indexes over multiple single-column indexes for multi-column queries.
- Use connection pooling via HikariCP (Spring Boot default) — configure max pool size to match application threads.
- Use Flyway or Liquibase for schema versioning — never run DDL manually.
- Use `@Transactional(readOnly = true)` on read-only queries to hint the database.
- Enable `PGVector` extension for embedding storage: `CREATE EXTENSION vector;`.

## Anti-Patterns

- N+1 query pattern in JPA — use `@EntityGraph` or `JOIN FETCH` for eager loading.
- Fetching entire tables when pagination is needed — use `LIMIT/OFFSET` or cursor-based pagination.
- Using `SELECT *` in production queries — always specify columns.
- String concatenation in queries — use parameterized queries or JPA criteria API.
- Lazy loading in serialization contexts (OpenAPI, Jackson) — use DTO projections instead.
- Long-running transactions — keep transactions scoped to the application service layer.

## Examples

**application.yml:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/service
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 30000
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc:
          batch_size: 25
        order_inserts: true
        order_updates: true
```

**JPA repository:**
```java
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    @EntityGraph(attributePaths = {"addresses"})
    Optional<Customer> findById(UUID id);

    @Query("SELECT c.email FROM Customer c WHERE c.id = :id")
    Optional<String> findEmailById(@Param("id") UUID id);
}
```
