# Create Service Playbook

## Required Agents

- architect
- implementation-engineer
- test-engineer
- security-engineer

## Required Skills

- java25-modern
- spring-boot4
- jpa-hibernate
- postgresql
- flyway
- openapi
- api-versioning
- spring-security
- oauth2-jwt
- kafka
- spring-cache
- resilience4j
- micrometer-prometheus
- opentelemetry
- unit-testing
- integration-testing
- testcontainers
- docker-compose
- conventional-commits
- trunk-based-development

## Workflow

### Phase 1: Analyze Requirements

1. Identify bounded context and service boundaries (DDD).
2. Define domain model: aggregates, entities, value objects.
3. Identify events the service publishes and subscribes to.
4. Define data ownership: what data lives in this service's database.
5. Identify external dependencies (other services, APIs, infrastructure).
6. Document architecture decision in ADR format.

**Output:** ADR with context, decision, rationale, and consequences.

### Phase 2: Design Service

1. Apply hexagonal architecture: domain/application/infrastructure/interfaces packages.
2. Define package structure: `com.example.{{service}}.{domain|application|infrastructure|interfaces}`.
3. Design aggregate roots with `@Version` for optimistic locking.
4. Define repository interfaces in `domain/port/`.
5. Design application services (use cases) with single responsibility.
6. Schedule tech design review with code-reviewer agent.

**Quality Gate:** ADR approved. No circular dependencies verified via ArchUnit.

### Phase 3: Design API

1. Identify resources (nouns) and operations (verbs).
2. Define OpenAPI 3.1 spec with `@RouterOperation` or `springdoc` annotations.
3. Choose versioning strategy: URL prefix (`/api/v1/`) by default.
4. Define request/response schemas using records.
5. Apply pagination: cursor-based for high-volume, offset-based for low-volume.
6. Use problem+json RFC 9457 for error responses.
7. Design endpoint security: which endpoints require auth, which roles.

**Output:** OpenAPI specification. API contract approved.

### Phase 4: Design Persistence

1. Create Flyway migration for initial schema (`V1__init.sql`).
2. Design SQL schema: tables, indexes, constraints, foreign keys.
3. Define JPA entities with `@Entity`, `@Table`, `@Id`, `@Version`.
4. Create Spring Data JPA repositories with derived/`@Query` methods.
5. Define projections for read-only queries.
6. Configure connection pool: HikariCP with sensible defaults.

**Quality Gate:** Migration script reviewed. Entity model matches domain model.

### Phase 5: Generate Implementation

1. Create directory structure matching hexagonal architecture.
2. Implement domain model (entities, value objects, domain events).
3. Implement repository interfaces in `domain/port/`.
4. Implement infrastructure adapters (JPA repositories, Kafka producers/consumers).
5. Implement application services with `@Transactional` boundaries.
6. Implement REST controllers with `@RequestMapping("/api/v1/...")`.
7. Implement `@ControllerAdvice` exception handler for problem+json.
8. Configure security: `@EnableWebSecurity`, `@EnableMethodSecurity`, JWT resource server.
9. Configure observability: Micrometer metrics, OpenTelemetry tracing.

**Output:** Complete service implementation matching the design ADR.

### Phase 6: Generate Tests

1. Write unit tests for all domain objects (no Spring context).
2. Write unit tests for all application services (mock repositories/publishers).
3. Write `@WebMvcTest` controller tests with mock service layer.
4. Write `@DataJpaTest` repository tests with Testcontainers PostgreSQL.
5. Write `@SpringBootTest` integration tests for end-to-end flows.
6. Write REST Docs tests for API documentation.
7. Write ArchUnit tests for architecture rules (no circular deps, domain isolation).

**Quality Gate:** >80% line coverage. All integration tests pass with Testcontainers.

### Phase 7: Generate Documentation

1. Generate OpenAPI spec via SpringDoc (available at `/v3/api-docs`).
2. Generate Spring REST Docs snippets from integration tests.
3. Publish API docs (Swagger UI at `/swagger-ui.html`).
4. Create `README.md` with: service name, purpose, API overview, local dev setup, build/run commands, required env vars.
5. Create ADR for any architectural decisions made during implementation.

**Output:** `README.md`, OpenAPI spec, ADR(s).

## Deployment Contract

The service expects:
- PostgreSQL database with connection string in `SPRING_DATASOURCE_URL`
- Kafka bootstrap server in `SPRING_KAFKA_BOOTSTRAP_SERVERS`
- OIDC issuer URI in `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`
- OTel collector endpoint in `OTEL_EXPORTER_OTLP_ENDPOINT`
- Prometheus scraping port on `8080` with path `/actuator/prometheus`
