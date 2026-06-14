# Microservice Patterns

## Purpose

Design service boundaries, communication patterns, and decomposition strategies using proven microservice architecture patterns. Provides implementation guidance, trade-off analysis, and code examples for each pattern.

## When to Use

- Defining service boundaries for a new service or splitting an existing monolith.
- Designing inter-service communication (synchronous vs asynchronous).
- Handling data consistency and resilience across service boundaries.
- Used by the architect agent during create-service and add-feature playbooks.

## Pattern Catalog

### 1. Decomposition by Business Capability

Align services with business functions (Customer, Order, Payment, Inventory, Notification), not technical layers.

**Trade-offs:** Start with broader boundaries (3-5 services) and split when cohesion justifies it. Splitting a service is cheaper than merging nanoservices.

**Implementation:**
```java
// Service A: Order Service — owns order lifecycle
// Service B: Payment Service — owns payment processing
// Service C: Inventory Service — owns stock management
// Service D: Notification Service — owns email/push/SMS delivery
```

### 2. Database per Service

Each service owns its data store. No direct database access across services. The only way to access another service's data is through its API or events.

**Trade-offs:** Eliminates hidden coupling and enables independent deployments. Increases complexity for cross-service queries (use API Composition or CQRS).

**Violation detection via ArchUnit:**
```java
@ArchTest
static final ArchRule no_cross_service_db_access = classes()
    .that().resideInAnyPackage("..infrastructure.persistence..")
    .should().onlyAccessClassesThat()
    .resideInSamePackage();
```

### 3. API Gateway

Route external traffic through a gateway for auth, rate limiting, request transformation, and routing to downstream services.

**Trade-offs:** Single network hop adds 2-5ms latency. Gateway becomes a deployment dependency. Use Spring Cloud Gateway for JVM-native or Kong/Envoy for polyglot.

```java
// Spring Cloud Gateway route example
@Bean
public RouteLocator customRoutes(RouteLocatorBuilder builder) {
    return builder.routes()
        .route("orders", r -> r.path("/api/v1/orders/**")
            .filters(f -> f.rewritePath("/api/v1/orders/(?<seg>.*)", "/$\\{seg}")
                .circuitBreaker(config -> config.setName("ordersCB").setFallbackUri("forward:/fallback/orders")))
            .uri("lb://order-service"))
        .route("payments", r -> r.path("/api/v1/payments/**")
            .uri("lb://payment-service"))
        .build();
}
```

### 4. Service Discovery

Services register themselves and discover each other via a registry. Use Kubernetes DNS (SRV records) in K8s environments, or Eureka/Consul otherwise.

**Implementation:**
```yaml
# Kubernetes: DNS-based discovery — use service names as host
# http://order-service.namespace.svc.cluster.local

# Spring Cloud Consul: application.yml
spring:
  cloud:
    consul:
      discovery:
        instanceId: ${spring.application.name}:${random.value}
        healthCheckPath: /actuator/health
```

### 5. Synchronous Communication (REST/gRPC)

Use for request-reply: queries, commands that need immediate confirmation.

**Trade-offs:** Tight coupling in time (both services must be up). Cascading failures risk. Use with circuit breakers and timeouts.

```java
// REST client with Resilience4j CircuitBreaker + Retry + TimeLimiter
@FeignClient(name = "inventory-service", url = "${inventory.service.url}")
@CircuitBreaker(name = "inventory", fallbackMethod = "fallback")
public interface InventoryClient {
    @GetMapping("/api/v1/stock/{sku}")
    @TimeLimiter(name = "inventory")
    @Retry(name = "inventory")
    StockResponse checkStock(@PathVariable String sku);
}
```

### 6. Asynchronous Communication (Events)

Use for state-changing operations that don't need immediate response. Events are published to Kafka and consumed by interested services.

```java
// Order Service publishes event
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, Object> kafka;

    public void orderPlaced(OrderPlacedEvent event) {
        kafka.send("order.events", event.orderId().toString(), event);
    }
}

// Inventory Service consumes event
@KafkaListener(topics = "order.events", groupId = "inventory-service")
public void handleOrderPlaced(OrderPlacedEvent event) {
    inventoryService.reserveStock(event.sku(), event.quantity());
}
```

### 7. Saga Pattern (Distributed Transactions)

Maintain data consistency across services without distributed transactions (no 2PC). Use choreography-based sagas (events) for simpler coupling.

**Choreography Saga:**
```
Order Service: OrderPlaced → (event)
Inventory Service: reserveStock() → StockReserved / StockRejected (event)
    Payment Service (on StockReserved): processPayment() → PaymentApproved / PaymentRejected (event)
        Order Service (on PaymentApproved): OrderConfirmed (event)
        Order Service (on PaymentRejected): OrderRejected + InventoryService: releaseStock() (event)
    Order Service (on StockRejected): OrderRejected (event)
```

**Trade-offs:** Eventual consistency. Compensating actions needed for rollback. Testing is harder. Consider orchestrator-based sagas when workflow is complex (>5 steps) or requires centralized monitoring.

```java
// Orchestrator Saga with Spring State Machine
@Configuration
@EnableStateMachine(name = "orderSaga")
public class OrderSagaConfig extends EnumStateMachineConfigurerAdapter<OrderState, OrderEvent> {
    @Override
    public void configure(StateMachineStateConfigurer<OrderState, OrderEvent> states) {
        states.withStates()
            .initial(OrderState.PENDING)
            .state(OrderState.RESERVING_STOCK)
            .state(OrderState.PROCESSING_PAYMENT)
            .end(OrderState.CONFIRMED)
            .end(OrderState.REJECTED);
    }
}
```

### 8. CQRS (Command Query Responsibility Segregation)

Separate read and write models when read and write workloads differ significantly.

**Trade-offs:** Adds complexity. Use only when: read volume >> write volume, read/write schemas differ, or you need different data stores (e.g., Elasticsearch for reads, PostgreSQL for writes).

```java
// Command side: Order entity with full behavior
// Write model uses JPA entities, domain events

// Query side: denormalized read model
// Read model uses projections or JDBC for flat, fast queries
public interface OrderSummaryRepository {
    @Query("""
        SELECT o.id AS id, o.status AS status, o.createdAt AS createdAt,
               COUNT(i.id) AS itemCount, SUM(i.price) AS total
        FROM Order o JOIN o.items i
        WHERE o.customerId = :customerId
        GROUP BY o.id
        """)
    Page<OrderSummary> findByCustomerId(@Param("customerId") UUID customerId, Pageable pageable);
}
```

### 9. Event Sourcing

Store all state changes as an append-only event log. Current state is derived by replaying events.

**Trade-offs:** Provides complete audit trail and temporal queries. Adds significant complexity: event schema evolution, replay performance, snapshots. Use only when audit/compliance requires full history.

**When NOT to use:** Simple CRUD, when current state is all that matters, when team is new to event sourcing.

### 10. Strangler Fig Pattern

Incrementally replace monolith functionality with microservices. Route traffic gradually from monolith to new service.

```
                                 ┌─────────────┐
                                 │   Gateway    │
                                 └──────┬──────┘
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                    ┌─────────┐    ┌──────────┐    ┌──────────┐
                    │Monolith │    │ Order    │    │ Payment  │
                    │(old)    │    │ Service  │    │ Service  │
                    └─────────┘    └──────────┘    └──────────┘
                         │               │               │
                      (strangled)    (new)            (new)
```

**Steps:**
1. Identify a bounded context to extract.
2. Build new service in parallel (duplicate data initially).
3. Route new traffic to new service via gateway.
4. Run dual-writes until confident.
5. Migrate existing data.
6. Decommission old code when no traffic remains.

### 11. Circuit Breaker

Protect services from cascading failures when a downstream dependency is slow or unavailable.

```java
@Bean
public Customizer<Resilience4JCircuitBreakerFactory> defaultCB() {
    return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
        .circuitBreakerConfig(CircuitBreakerConfig.custom()
            .slidingWindowSize(10)
            .minimumNumberOfCalls(5)
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(10))
            .permittedNumberOfCallsInHalfOpenState(3)
            .build())
        .timeLimiterConfig(TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofSeconds(2))
            .build())
        .build());
}
```

### 12. Transactional Outbox

Ensure reliable event publishing: write event to an outbox table in the same database transaction as the domain change. A separate publisher polls the outbox and sends to Kafka.

```java
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id private UUID id;
    @Column(nullable = false) private String aggregateType;
    @Column(nullable = false) private String aggregateId;
    @Column(nullable = false) private String eventType;
    @Column(nullable = false, columnDefinition = "jsonb") private String payload;
    @Column(nullable = false) private boolean published;
    @Column(nullable = false) private Instant createdAt;
}

// Scheduled publisher
@Component
public class OutboxPublisher {
    @Transactional
    @Scheduled(fixedDelay = 500)
    public void publish() {
        var events = repository.findAllByPublishedFalseOrderByCreatedAt();
        for (var event : events) {
            kafkaTemplate.send(kafkaTopic, event.getAggregateId(), event.getPayload()).get();
            event.setPublished(true);
        }
    }
}
```

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|---|---|---|
| Shared database | Hidden coupling, can't deploy independently | Database per service |
| Nanoservices | Too many services, high ops cost | Start broad, split when cohesive |
| Synchronous call chains (A→B→C) | Cascading failures, high latency, tight coupling | Async events for multi-step workflows |
| Distributed monolith | Coordinated deployments, not independently deployable | Enforce independent deployability via CI/CD |
| Premature event sourcing | Massive complexity for simple CRUD | Start with JPA, add event sourcing only when audit/history is required |
| Over-aggregation | God aggregates with too many responsibilities | Split by consistency boundary |
| REST for everything | Latency overhead for high-throughput scenarios | Events for commands, REST for queries, gRPC for internal high-throughput |

## Pattern Decision Matrix

| When | Pattern |
|---|---|
| Need to split a monolith | Strangler Fig + Decomposition by Business Capability |
| Service A needs data from Service B | API Composition or CQRS |
| Must guarantee event delivery | Transactional Outbox |
| Distributed transaction across 2+ services | Saga (choreography or orchestrated) |
| External client needs single entry point | API Gateway |
| Read volume >> Write volume | CQRS |
| Need full audit trail | Event Sourcing |
| Downstream dependency is unreliable | Circuit Breaker + Retry + Time Limiter |

## Application Checklist

- Service boundaries aligned with business capabilities (not technical layers)
- Database per service — no cross-service DB access
- Saga pattern for multi-service workflows (not distributed transactions)
- Circuit breakers configured for all HTTP/gRPC downstream calls
- Transactional outbox for guaranteed event delivery
- API Gateway for cross-cutting concerns (auth, rate limiting, routing)
- CQRS evaluation completed (use only when read/write workloads differ)
- Event sourcing decision documented with rationale
- ArchUnit rules enforce hexagonal architecture and database isolation
