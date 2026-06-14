# ADR-003: Testing Strategy

**Status:** Accepted  
**Date:** 2026-06-14  
**Decision-Makers:** architecture-agent, test-engineer

## Context

Services need a consistent, automated testing approach that provides fast feedback, high confidence, and minimal flakiness. Each test type serves a different purpose and runs at a different cadence.

## Decision

Adopt the **Test Pyramid with Service-Level Integration Testing**:

```
         ╱── E2E ──╲           (1-2 per service)
        ╱── Integration ──╲     (10-20% of tests)
       ╱── Unit ───────────╲    (80-90% of tests)
```

### Test Types

| Type | Scope | Runtime | Cadence | Framework |
|---|---|---|---|---|
| Unit | Single class, mocked boundaries | < 100ms | Per commit | JUnit 5 + Mockito + AssertJ |
| Integration | Persistence, API, message flows | < 10s | Per commit | Testcontainers + @SpringBootTest |
| E2E | Full system across services | < 60s | Per release | Testcontainers + Docker Compose |
| Contract | API contracts between services | < 30s | Per commit | Spring Cloud Contract / Pact |
| Performance | Throughput, latency, GC | Hours | Per release | k6 / Gatling + JFR |
| Security | OWASP, dependency scan | < 5m | Per sprint | ZAP + Trivy + dependency-check |

### Unit Testing Rules

- Cover all domain entities, value objects, and use cases.
- No Spring context — pure JUnit 5 with Mockito.
- Use AssertJ for fluent assertions.
- Use parametrized tests for boundary and edge cases.
- Test public API only — never private methods directly.

### Integration Testing Rules

- Use Testcontainers for PostgreSQL, Kafka, Redis (never H2 in-memory).
- Use `@WebMvcTest` for controller slice tests.
- Use `@DataJpaTest` for repository slice tests.
- Use `@SpringBootTest` for end-to-end flows with mocked external services.
- Each test class uses a fresh Testcontainers container (or singleton via `@Testcontainers`).
- Use `@DirtiesContext` sparingly — prefer test isolation via rollback transactions.

### E2E Testing Rules

- Test critical user journeys only (smoke tests).
- Run against a deployed environment (staging).
- Minimal set: 3-5 tests per service covering the main flows.

### Contract Testing Rules

- Provider publishes contract (OpenAPI spec).
- Consumer verifies contract expectations.
- Breaking schema changes must be coordinated across teams before deployment.

### ArchUnit Testing

Enforce architecture rules automatically:

```java
@ArchTest
static final ArchRule domain_should_not_depend_on_spring = classes()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAnyPackage("org.springframework..")
    .as("Domain layer must not depend on Spring framework");

@ArchTest
static final ArchRule hexagonal_layers = layeredArchitecture()
    .consideringAllDependencies()
    .layer("Domain").definedBy("..domain..")
    .layer("Application").definedBy("..application..")
    .layer("Infrastructure").definedBy("..infrastructure..")
    .layer("Interfaces").definedBy("..interfaces..")
    .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Infrastructure", "Interfaces")
    .whereLayer("Application").mayOnlyBeAccessedByLayers("Infrastructure", "Interfaces")
    .whereLayer("Infrastructure").mayNotBeAccessedByLayers("Domain", "Application");
```

## Consequences

**Positive:**
- Consistent test structure across all services.
- Fast unit tests (< 100ms each) enable TDD workflow.
- Integration tests use real infrastructure (Testcontainers), not H2.
- ArchUnit tests prevent architecture drift automatically.

**Negative:**
- Integration tests require Docker (Testcontainers). CI runners must have Docker.
- E2E tests add complexity for cross-service orchestration.
- Contract testing requires cross-team coordination.

## Compliance

- All services must include ArchUnit tests.
- Integration tests must use Testcontainers (not H2).
- Unit test coverage must be >= 80%.
- @SpringBootTest must be justified (why cannot be a slice test?).
