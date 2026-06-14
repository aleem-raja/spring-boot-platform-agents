# Architecture Decision Records

## Purpose

Document significant architectural decisions using lightweight Architecture Decision Records (ADRs) following the MADR (Markdown ADR) format.

## When to Use

- Every architectural decision that affects service structure, technology choice, API design, or deployment strategy.
- Required by the architect agent for every create-service and add-feature playbook run.
- Required when introducing a new technology, changing a communication pattern, or modifying the data model.

## Best Practices

- One ADR per decision. Do not bundle multiple decisions in a single record.
- Use the MADR template: Title, Status, Context, Decision, Consequences, Alternatives Considered.
- Number ADRs sequentially: ADR-001, ADR-002, etc.
- Store ADRs in `docs/adr/` in the service repository.
- Keep ADRs under 200 words in the Context section — concise enough to read in 2 minutes.
- Use ADR status: Proposed, Accepted, Deprecated, Superseded.
- Reference related ADRs with cross-links: `See ADR-003 for database selection rationale.`
- Review ADRs periodically for staleness — a decision that is no longer valid should be marked Superseded.
- ADRs are written by the architect, reviewed by the team, and committed before implementation begins.

## Anti-Patterns

- Writing ADRs after implementation — defeats the purpose. The ADR should guide, not document, the implementation.
- Making ADRs too verbose — if the context is longer than 300 words, the decision should be split.
- Using ADRs for implementation details — ADRs document why, not how. Implementation details go in code comments.
- Forgetting to update ADRs when decisions change — a wrong ADR is worse than no ADR.
- No ADR for trivial decisions — use ADRs only for decisions that have meaningful alternatives or consequences.

## Examples

```markdown
# ADR-003: PostgreSQL as Primary Data Store

## Status

Accepted

## Context

We need a relational database for the new customer service.
The service requires ACID transactions, JSON document storage,
and vector embeddings for future AI-powered search features.

## Decision

Use PostgreSQL 17 with the pgvector extension.

PostgreSQL provides ACID compliance, native JSONB for document storage,
and pgvector for embedding similarity search — all in a single database,
eliminating the operational cost of managing a separate vector database.

## Consequences

Positive:
- Single database technology reduces operational complexity
- pgvector enables semantic search without additional infrastructure
- JSONB supports schema-flexible document storage

Negative:
- Service is tied to PostgreSQL-specific features (pgvector)
- Migration to another database requires replacing pgvector usage

## Alternatives Considered

1. MySQL — lacks pgvector equivalent; would require separate vector database
2. MongoDB — good document support but no native ACID across collections
3. CockroachDB — strong distributed SQL but higher latency for single-region
```

**ADR directory structure:**
```
docs/
└── adr/
    ├── ADR-001-vendor-neutral-agent-platform.md
    ├── ADR-002-service-template-structure.md
    ├── ADR-003-postgresql-as-primary-store.md
    └── README.md  (index of all ADRs with statuses)
```
