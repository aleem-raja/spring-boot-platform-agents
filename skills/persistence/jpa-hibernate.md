# Spring Data JPA / Hibernate

## Purpose

Model and persist domain entities using JPA with Hibernate as the provider, following best practices for performance, consistency, and testability.

## When to Use

- Every service with a relational database.
- Required by implementation-engineer for persistence layer code.
- Required by performance-engineer to review N+1 queries, lazy loading, and fetch strategies.

## Best Practices

### Entity Design

```java
@Entity
@Table(name = "orders")
public class Order {
    @Id
    private UUID id;

    @Version
    private long version;

    @Column(nullable = false, length = 50)
    @Enumerated(STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    protected Order() {} // JPA requires
    public Order(UUID customerId) {
        this.id = UUID.randomUUID();
        this.customerId = customerId;
        this.status = OrderStatus.PENDING;
    }
}
```

### Repository Patterns

```java
public interface OrderRepository extends JpaRepository<Order, UUID> {
    // Use derived queries for simple lookups
    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    // Use @Query for complex queries
    @Query("""
        SELECT o FROM Order o
        JOIN FETCH o.items
        WHERE o.id = :id
        """)
    Optional<Order> findByIdWithItems(@Param("id") UUID id);

    // Projections for read-only views
    @Query("SELECT o.id AS id, o.status AS status, o.createdAt AS createdAt FROM Order o WHERE o.customerId = :customerId")
    List<OrderSummary> findSummariesByCustomerId(@Param("customerId") UUID customerId);
}

// Projection (no need @Entity — read-only)
public interface OrderSummary {
    UUID getId();
    OrderStatus getStatus();
    Instant getCreatedAt();
}
```

### Fetching Strategy

| Scenario | Solution |
|---|---|
| Single entity with no relations | Default `@ManyToOne(fetch=EAGER)` is fine |
| Entity list, no related data needed | Use `@NamedEntityGraph` or `@Query` with no fetch |
| Entity + one specific relation | `JOIN FETCH` in `@Query` |
| Entity + multiple deep relations | Use `@EntityGraph` or multiple queries |
| Read-only data, no mutations | Use projections or DTO queries |

### Avoid N+1 Queries

```java
// BAD — lazy loads items one by one
for (Order order : orderRepository.findAll()) {
    for (OrderItem item : order.getItems()) { ... }
}

// GOOD — fetch join loads everything in one query
@Query("SELECT o FROM Order o LEFT JOIN FETCH o.items")
List<Order> findAllWithItems();
```

### Batch Operations

```java
// Bulk update
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("UPDATE Order o SET o.status = :status WHERE o.id IN :ids")
int updateStatus(@Param("ids") Set<UUID> ids, @Param("status") OrderStatus status);
```

### Auditing

```java
@Configuration
@EnableJpaAuditing
public class JpaConfig {}

// Or per-entity with @EntityListeners(AuditingEntityListener.class)
```

### Soft Deletion

```java
@Entity
@Where(clause = "deleted = false")
@SQLRestriction("deleted = false")
@SQLDelete("UPDATE orders SET deleted = true WHERE id = ?")
public class Order {
    @Column(nullable = false)
    private boolean deleted;
}
```

### Pagination

```java
@GetMapping
public Page<OrderSummary> list(@PageableDefault(size = 20) Pageable pageable) {
    return orderRepository.findSummariesByCustomerId(customerId, pageable);
}
```

### Concurrency (Optimistic Locking)

Add `@Version long version` field. Hibernate increments on every update. If a concurrent modification happened, `OptimisticLockException` is thrown — retry the transaction.

## Anti-Patterns

- **Entity returned directly in REST response** — creates coupling. Use DTOs or projections.
- **@ManyToOne(fetch=EAGER) on collections** — causes cartesian product joins and massive data load.
- **LazyInitializationException catch** — indicates improper session management. Fix the fetch, not the exception.
- **save() inside loops** — flushes after each save. Batch with `saveAll()` and flush once.
- **@Data with @Entity** — Lombok @Data generates equals/hashCode based on all fields, breaking JPA identity. Use @Getter @Setter.
- **Hibernate-specific annotations** — prefer JPA standard (`javax.*` / `jakarta.*`). Use Hibernate annotations only when JPA has no equivalent.
- **Selecting entire entities for read-only** — use projections or `@QueryHints(@QueryHint(name = HINT_READONLY, value = "true"))`.

## Application Checklist

- `@Version` field on all entities (optimistic locking)
- `@CreatedDate` / `@LastModifiedDate` for auditing
- `JOIN FETCH` or `@EntityGraph` in all queries returning relations
- Projections for read-only endpoints (no full entity serialization)
- `spring.jpa.open-in-view=false` — disable OSIV to prevent lazy loads in views
- Pagination on all collection endpoints (no unlimited `findAll`)
- `spring.jpa.properties.hibernate.jdbc.batch_size` set (default 50)
- Flyway migration for every schema change (no `ddl-auto=update` in production)
