# Microservice Patterns

## Purpose

Design service boundaries, communication patterns, and decomposition strategies using proven microservice architecture patterns.

## When to Use

- Defining service boundaries for a new service or splitting an existing monolith.
- Designing inter-service communication (synchronous vs asynchronous).
- Handling data consistency across service boundaries.
- Used by the architect agent during the create-service and add-feature playbooks.

## Best Practices

- **Decompose by business capability** — align services with business functions (customer, order, payment, inventory), not technical layers.
- **Define bounded contexts** — use Domain-Driven Design to identify aggregate roots and consistency boundaries.
- **Data ownership per service** — each service owns its data store. No shared databases across services.
- **Synchronous for queries, async for commands** — use REST/gRPC for request-reply queries; use events for state-changing commands.
- **Sagas for distributed transactions** — use choreography-based sagas (events) over orchestration-based (central coordinator) for simpler coupling.
- **Circuit breakers for resilience** — use Resilience4j for HTTP calls; fail fast when a dependency is unhealthy.
- **API gateway for cross-cutting concerns** — route traffic through a gateway for auth, rate limiting, and request transformation.
- **Strangler Fig for migration** — incrementally replace monolith functionality with services; route traffic gradually.

## Anti-Patterns

- Shared database across services — creates hidden coupling, makes independent deployment impossible.
- Too-small services (nanoservices) — each service adds operational overhead. Start with broader boundaries; split when justified.
- Synchronous call chains (A calls B calls C) — creates cascading failures and latency spikes. Use async events for multi-step workflows.
- Distributed monolith — services that require coordinated deployment. Deploy independently or it is not microservices.
- Premature event sourcing — event sourcing adds complexity. Use it only when audit history or temporal queries are required.

## Examples

**Event-driven communication pattern:**
```
Order Service (publishes) → Kafka Topic: order.events
Inventory Service (subscribes) → updates stock on OrderPlaced
Notification Service (subscribes) → sends email on OrderConfirmed
```

**Saga pattern example:**
```
OrderPlaced → InventoryService: reserveStock()
    success → PaymentService: processPayment()
        success → OrderConfirmed
        failure → InventoryService: releaseStock(), OrderRejected
    failure → OrderRejected
```
