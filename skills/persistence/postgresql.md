# PostgreSQL

## Purpose

Design and optimize PostgreSQL data access for Spring Boot services using JPA or JDBC, with best practices for query performance, connection management, and schema evolution.

## When to Use

- Default relational database for all Spring Boot services.
- Use for OLTP workloads requiring ACID transactions.
- Use PGVector extension for vector embeddings when AI features require semantic search.

## Best Practices

### Schema Design

```sql
-- Always use UUID primary keys for distributed-friendliness
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
-- Partial index for active orders
CREATE INDEX idx_orders_active ON orders(created_at DESC) WHERE status NOT IN ('CANCELLED', 'COMPLETED');
```

### Migration Naming Convention

```
V1__init_schema.sql                    -- Initial schema
V2__add_customer_preferences.sql       -- Add new table
V3__add_order_type_column.sql          -- Add column
V4__create_index_orders_status.sql     -- Add index
V5__backfill_order_totals.sql          -- Data migration (idempotent)
R__customer_view.sql                   -- Repeatable (re-runs if hash changes)
```

### Connection Pooling (HikariCP)

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 300000
      connection-timeout: 5000
      max-lifetime: 600000
      leak-detection-threshold: 30000
      pool-name: MainPool
```

**Pool sizing formula:** `pool_size = T * (C - 1)` where T = number of threads, C = number of connections per thread. For virtual threads, connections are only held during actual DB operations, so a smaller pool (5-10) often suffices even with many threads.

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE before deploying schema changes
EXPLAIN ANALYZE
SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.customer_id = 'uuid'
  AND o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 20;

-- Prefer composite indexes for multi-column filters
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status) WHERE status = 'PENDING';

-- Use covering indexes for frequently accessed read patterns
CREATE INDEX idx_orders_list ON orders(customer_id, created_at DESC, id, status, total_amount);
```

### Read-Only Transactions

```java
@Service
public class OrderQueryService {
    private final OrderRepository repository;

    @Transactional(readOnly = true)
    public OrderSummary getSummary(UUID orderId) {
        return repository.findSummaryById(orderId);
    }
}
```

Hint to Hibernate for read-only optimization:
```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50
          fetch_size: 100
        order_inserts: true
        order_updates: true
        query:
          in_clause_parameter_padding: true
```

### PGVector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE product_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    embedding vector(1536),  -- OpenAI ada-002 dimension
    model VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_embeddings_hnsw
    ON product_embeddings
    USING hnsw (embedding vector_cosine_ops);
```

```java
// JPA entity
@Entity
@Table(name = "product_embeddings")
public class ProductEmbedding {
    @Id
    private UUID id;

    @Column(columnDefinition = "vector(1536)")
    private float[] embedding;
}

// Native query for vector search
@Query(value = """
    SELECT product_id, embedding <-> :query AS distance
    FROM product_embeddings
    ORDER BY distance
    LIMIT :limit
    """, nativeQuery = true)
List<Object[]> findSimilar(@Param("query") float[] query, @Param("limit") int limit);
```

## Anti-Patterns

- **N+1 queries in JPA** — use `@EntityGraph` or `JOIN FETCH` for eager loading of related entities.
- **H2 in tests** — H2 is not compatible with PostgreSQL features (JSONB, PGVector, array types, window functions). Use Testcontainers.
- **`SELECT *` in production** — always specify columns to reduce I/O and network transfer.
- **String concatenation in SQL** — use parameterized queries to prevent SQL injection and query plan cache misses.
- **Long-running transactions** — keep transactions scoped to the application service layer. Never hold transactions across HTTP calls.
- **Connection leak** — always close connections. HikariCP leak-detection-threshold helps detect this.
- **Direct `ddl-auto=update` in production** — use Flyway/Liquibase for all schema changes.
- **Missing NOT NULL constraints** — add NOT NULL to columns that must have values; Hibernate validates non-nullability at the app level but the DB should enforce it.

## Application Checklist

- UUID primary keys with `gen_random_uuid()` default
- `TIMESTAMPTZ` for all timestamp columns
- Composite indexes on query patterns (WHERE + ORDER BY combined)
- Flyway migration for every schema change
- `spring.jpa.hibernate.ddl-auto=validate` in production
- HikariCP pool sized appropriately (tested with expected concurrency)
- `@Transactional(readOnly = true)` on read-only queries
- PGVector extension enabled (if vector search is needed)
- Partial indexes for filtered queries
- `EXPLAIN ANALYZE` reviewed for all critical queries
