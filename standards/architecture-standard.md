# Architecture Standard

Reusable architecture rules for Spring Boot services.

## Service Structure

- One service per bounded context (Domain-Driven Design).
- Prefer hexagonal architecture (ports and adapters) over layered architecture.
- domain/ package must have zero framework dependencies.
- application/ package contains use-case orchestration only.
- infrastructure/ package implements ports (persistence, messaging, HTTP clients).
- interfaces/ package contains REST controllers, gRPC handlers, and message listeners.

## Module Organization

Group by feature, not by layer:

```
com.example.service
├── domain/
│   ├── model/       # Aggregates, entities, value objects
│   └── port/        # Repository, gateway interfaces
├── application/
│   └── usecase/     # Single-responsibility use cases
├── infrastructure/
│   ├── persistence/ # JPA/PgVector implementations
│   ├── messaging/   # Kafka/RabbitMQ adapters
│   └── client/      # External API clients
└── interfaces/
    └── rest/        # Controllers, DTOs, mappers
```

## API Design

- Version all REST APIs via URL prefix (/api/v1/, /api/v2/). See `skills/api/api-versioning.md` for full versioning strategy, deprecation policy, and evolution rules.
- Use OpenAPI 3.1 specification for all endpoints. Use SpringDoc group-configs to document multiple active versions.
- Prefer RESTful resource-oriented APIs over RPC-style endpoints.
- Use pagination for all collection endpoints (cursor-based for high-volume, offset-based for low-volume).
- Use problem+json RFC 9457 for error responses.
- Breaking changes require a major version bump. Additive changes (new fields, new endpoints) are safe within the current version.
- Deprecated endpoints must include Sunset and Deprecation headers, a migration link, and a sunset date at least 6 months out (12 months for public APIs).
- Never remove a version with active traffic. Monitor metrics before sunsetting.

## Persistence Rules

- Default to PostgreSQL for primary data store.
- Use Flyway for schema migrations (versioned, repeatable).
- Use PGVector for vector embeddings when AI features require semantic search.
- Repositories belong in domain/port/; implementations in infrastructure/persistence/.
- Use @Transactional at the application service layer, not in controllers.

## Technology Decision Matrix

| Concern | Default | Alternative |
|---|---|---|
| Relational DB | PostgreSQL | MySQL, CockroachDB |
| Migration | Flyway | Liquibase |
| Build | Maven | Gradle |
| Messaging | Kafka (event-driven) | RabbitMQ (task-driven) |
| Container | Docker | Podman |
| Orchestration | Compose (dev), K8s (prod) | Nomad, ECS |
| CI/CD | GitHub Actions | GitLab CI, Jenkins |

## Observability Requirements

- All services expose /actuator/health, /actuator/metrics, /actuator/prometheus.
- Export Micrometer metrics to Prometheus; visualize in Grafana.
- Export OpenTelemetry traces to Tempo or Jaeger.
- Structured JSON logging via Logback; include traceId, spanId, service.name.

## Dependency Rules

- No circular dependencies between modules.
- domain/ must not depend on Spring, JPA, or any infrastructure framework.
- application/ may depend on Spring for @Transactional only.
- infrastructure/ and interfaces/ depend on domain/ and application/.
