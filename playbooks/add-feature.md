# Add Feature Playbook

Add a new feature (endpoint, use case, message handler) to an existing Spring Boot service.

## Required Agents

- architect — design feature scope and impact
- implementation-engineer — write feature code
- test-engineer — write feature tests
- code-reviewer — review changes

## Required Skills

- `skills/java/java25-modern` — language features for implementation
- `skills/spring/spring-boot4` — Spring Boot patterns for the feature type
- `skills/testing/integration-testing` — verify feature works with real dependencies
- `skills/persistence/postgresql` — if the feature touches the database
- `skills/security/oauth2-jwt` — if the feature requires auth
- `skills/observability/opentelemetry` — if the feature needs custom observability

## Workflow

1. **architect: Scope the feature**
   - Identify the bounded context affected
   - Determine whether the feature requires new endpoints, events, or background processing
   - Create ADR if the feature introduces architectural changes

2. **architect: Design the interface**
   - Define API contract (request/response schema, HTTP method, path)
   - Define event schema (if async)
   - Update OpenAPI spec

3. **implementation-engineer: Implement domain logic**
   - Add domain entities or value objects if needed
   - Implement use case class in application layer
   - Add repository interface in domain/port

4. **implementation-engineer: Implement infrastructure**
   - Add JPA entity or repository implementation
   - Add controller with OpenAPI annotations
   - Add migration script if schema changes

5. **test-engineer: Write tests**
   - Unit tests for domain logic
   - Integration tests with Testcontainers for persistence
   - API contract tests with MockMvc/WebTestClient

6. **code-reviewer: Review implementation**
   - Verify code follows coding-standard
   - Verify test coverage and test quality
   - Verify security implications

7. **release-engineer: Prepare release**
   - Update CHANGELOG
   - Create release notes

## Outputs

- Implementation code (domain, application, infrastructure layers)
- Migration script (if schema changes)
- Tests (unit, integration, API)
- Updated OpenAPI spec
- CHANGELOG entry
