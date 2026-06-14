# Generate Docs Playbook

Generate comprehensive documentation for a Spring Boot service, including API docs, architecture docs, and operational runbooks.

## Required Agents

- architect — document architecture decisions
- implementation-engineer — document code and API details

## Required Skills

- `skills/documentation/openapi` — REST API documentation
- `skills/documentation/architecture-decision-records` — ADR documentation
- `skills/observability/opentelemetry` — observability documentation

## Workflow

1. **architect: Generate ADRs**
   - Review all architectural decisions made during service development
   - Create ADRs for decisions that were not previously documented
   - Update ADR statuses (superseded, deprecated) as needed

2. **implementation-engineer: Generate API docs**
   - Run SpringDoc to produce OpenAPI 3.1 specification
   - Validate spec with openapi-generator or spectral linting
   - Add API examples to the specification

3. **architect: Document service architecture**
   - Describe service boundaries, bounded contexts
   - Document communication patterns (sync/async events)
   - Document data model and persistence strategy
   - Create architecture diagram (ASCII or Mermaid)

4. **implementation-engineer: Document operational runbooks**
   - Health check endpoints
   - Configuration properties
   - Environment variables
   - Migration commands
   - Rollback procedure

5. **architect: Review documentation**
   - Verify all endpoints are documented
   - Verify error responses are documented
   - Verify ADRs are complete and consistent

## Outputs

- OpenAPI 3.1 specification file (openapi.yml)
- ADR documents in docs/adr/
- Architecture overview document
- Operational runbook
- Configuration reference
