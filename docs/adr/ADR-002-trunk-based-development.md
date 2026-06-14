# ADR-002: Trunk-Based Development

## Status

Accepted

## Context

The original engineering-standard defined a branch strategy with `feat/*`, `fix/*`, `chore/*` branches merging to `main`. However, it did not specify branch lifespan limits, feature flag requirements for incomplete work, or the relationship between branching strategy and CI/CD pipeline design.

Teams using this platform need a branching model that:

- Supports continuous delivery with multiple deployments per day.
- Minimizes merge conflicts as the codebase and team grow.
- Works with the automated release tooling (semantic-release, release-please) defined in v0.2.
- Aligns with DORA metrics (deployment frequency, lead time for changes, MTTR, change failure rate).
- Avoids the known anti-patterns of GitFlow (long-lived branches, painful merges, late integration).

## Decision

Adopt **Trunk-Based Development (TBD)** as the standard branching strategy for all Spring Boot services on this platform.

### Rules

1. `main` (the trunk) is always deployable. Every commit triggers CI/CD.
2. Feature branches live at most 2 days. If a branch is not merged within 2 days, it must be rebased and reviewed for abandonment.
3. Every developer merges to main at least once per day.
4. Incomplete features are merged behind runtime feature flags — never held on branches.
5. Release branches exist only for versioned SDK/library releases. Cherry-pick critical fixes only; no development on release branches.
6. No `develop`, `staging`, or long-lived integration branches.

### Prerequisites

- CI pipeline under 10 minutes.
- Comprehensive test suite with ≥ 80% coverage.
- Code review initial feedback within 4 business hours.
- Feature flag infrastructure available.

## Consequences

### Positive

- Eliminates the integration pain point of GitFlow — no "merge week" before releases.
- Enables continuous deployment directly from main with canary and feature flag guardrails.
- Reduces merge conflict frequency and severity — small diffs merge cleanly.
- Aligns CI/CD pipeline design with the branching model — one pipeline, one branch, one deployment path.

### Negative

- Requires feature flag infrastructure — teams must invest in flag management (toggles, SDKs, dashboard).
- Requires CI pipeline speed optimization — slow CI defeats TBD because developers cannot get fast feedback.
- Requires team discipline — developers accustomed to long-lived branches need training on slicing work into small, mergeable increments.
- Not suitable for all project types — desktop software, embedded systems, or SDKs with strict versioning may still need release branches.

## Alternatives Considered

### GitHub Flow

Similar to TBD but allows longer-lived branches (no 2-day limit) and no feature flag requirement.

- Rejected: Without the 2-day limit and feature flags, teams drift back toward GitFlow behaviors.
- Without feature flags, incomplete work stays on branches, defeating CI.

### GitFlow

Separate `develop` and `main` branches with long-lived feature branches and release branches.

- Rejected: GitFlow is incompatible with continuous delivery. The `develop` branch creates a stale integration point.
- DORA research shows GitFlow teams have lower deployment frequency and higher change failure rates.

### No Standard

Let each team choose its own branching strategy.

- Rejected: Inconsistent branching across services creates confusion about where to find code, how to cut releases, and how CI/CD is configured. Platform-consistency is a stated goal.

## Related

- ADR-001: Vendor-Neutral Agent Platform Architecture
- skills/git/trunk-based-development.md
- skills/git/conventional-commits.md
- standards/engineering-standard.md
