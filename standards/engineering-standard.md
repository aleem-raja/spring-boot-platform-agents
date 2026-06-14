# Engineering Standard

Reusable engineering process conventions for Spring Boot services.

## Branch Strategy

Adopt **Trunk-Based Development (TBD)** — the only branching strategy that enables continuous delivery.

### Rules

- `main` (the trunk) — production-ready, always deployable. Protected: requires PR + status checks + CI passing. Every commit must pass all checks.
- `feat/<issue-number>-<short-description>` — feature work. Max lifespan: 2 days. Merge via squash-merge. If not merged within 2 days, rebase and re-review or abandon.
- `fix/<issue-number>-<short-description>` — bug fixes. Same flow as feature branches.
- `chore/<issue-number>-<short-description>` — dependency updates, tooling, CI changes.
- No `develop`, `staging`, or long-lived integration branches. Use feature flags for incomplete work behind runtime toggles.
- Release branches (`release/v<major>.<minor>`) are cut from main only for versioned SDK releases. Cherry-pick critical fixes only. No development on release branches.
- Every developer must merge to main at least once per day to prevent divergence.

### Prerequisites

Before adopting TBD, the following must be in place:

1. CI pipeline completes in under 10 minutes
2. Test coverage ≥ 80% with deterministic tests
3. Code review initial feedback within 4 business hours
4. Feature flags available for incomplete work

## Commit Conventions

Follow Conventional Commits 1.0 (see `skills/git/conventional-commits.md`):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types and SemVer mapping: `feat` → MINOR, `fix` → PATCH, `feat!:` → MAJOR, `BREAKING CHANGE:` → MAJOR.

All other types (`chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`): no version bump.

Breaking changes: append `!` after type/scope (short form), or add `BREAKING CHANGE:` footer (long form).

Examples:
```
feat(customer): add address lookup endpoint
fix(payment): handle null webhook signature
feat!(payment): remove deprecated webhook v1 endpoint
security(auth): upgrade spring-security to 7.2.1 (CVE-2026-1234)
docs(api): document rate limit headers
```

## Pull Request Standards

- Every PR must have a description explaining what and why (not just the title).
- Every PR must reference an issue number.
- Every PR must include tests for new functionality or bug fixes.
- Every PR must include a CHANGELOG entry in the unreleased section.
- Every PR must pass all status checks before merge.
- Every PR should be under 400 lines of changed code. Larger PRs must be split.
- Squash-merge to main. No merge commits.
- PR title must follow Conventional Commits format — it becomes the squash-merge commit message.
- PR body becomes the commit body. Clean up before merging.
- PR lifespan should not exceed 2 calendar days. Longer PRs require justification.

## Definition of Done

A task is done when all of the following are true:

1. [ ] Code compiles without warnings
2. [ ] All tests pass (unit + integration + contract)
3. [ ] Test coverage ≥ 80% for new code
4. [ ] API changes are reflected in OpenAPI spec
5. [ ] Documentation generated and verified (Spring REST Docs or SpringDoc)
6. [ ] Documentation deployed to Pages (GitHub/GitLab Pages) as static site
7. [ ] CHANGELOG entry exists in unreleased section
8. [ ] ADR is created (if architecture decision was made)
9. [ ] Security review passed (if sensitive data or auth changes)
10. [ ] Migration scripts are written (if schema changes)
11. [ ] Integration tests run with Testcontainers pass
12. [ ] The service starts with the new code in production-like profile

## Code Review Cadence

- Review requests must receive initial feedback within 4 business hours.
- Authors should respond to review comments within 2 business hours.
- Stale PRs (no activity for 3 business days) are reassigned by the platform team.
- No self-merging. Every PR needs at least one approving review.
- Security-critical changes require two approving reviews.

## Dependency Management

- Use Maven BOM or Gradle platform to pin all dependency versions centrally.
- Update dependencies at least monthly (Dependabot or Renovate).
- CVE fixes take priority: patch within 48 hours for critical, 7 days for high.
- No snapshot dependencies in production builds.
- Use `maven-enforcer-plugin` or Gradle consistent with fail on dependency convergence errors.

## Observability Requirements

Every service must emit:

- `/actuator/health` — liveness and readiness endpoints
- `/actuator/prometheus` — Micrometer metrics
- Structured JSON logs (Logback with ECS or Logstash encoder)
- OpenTelemetry traces with consistent service.name attribute
- Custom business metrics for key operations (orders placed, payments processed, errors by type)

Failure to meet these requirements is a release blocker.

## Incident Response

| Severity | Response time | Communication |
|---|---|---|
| Critical (service down) | 15 minutes | PagerDuty + Slack |
| High (partial outage) | 1 hour | Slack |
| Medium (degraded) | 4 hours | Slack (next business day) |
| Low (cosmetic) | Next sprint | Jira ticket |
