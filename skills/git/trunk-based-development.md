# Trunk-Based Development

## Purpose

Adopt a branching strategy where developers integrate small, frequent changes directly into a single shared branch (the trunk) using short-lived feature branches or direct commits, enabling continuous integration and rapid deployment.

## When to Use

- Teams practicing continuous delivery with CI/CD pipelines.
- Microservice architectures requiring frequent, independent deployments.
- Teams with strong automated testing discipline.
- Replaces GitFlow or long-lived feature branch strategies.

## Core Rules

### Rule 1: One Trunk, Always Deployable

- `main` (the trunk) must always be in a deployable state.
- Every commit to main triggers CI/CD — builds, tests, security scans, and potentially deployment.
- No `develop`, `staging`, or long-lived integration branches.

### Rule 2: Short-Lived Branches Only

- Feature branches live at most 1–2 days, ideally hours.
- A branch should contain at most a few focused commits that represent a single logical change.
- If a branch is older than 2 days without merging, it must be rebased onto main and reviewed for abandonment.

### Rule 3: Commit to Main at Least Once Daily

- Every developer must merge changes into main at least once per day.
- This prevents divergence, reduces merge conflict size, and enforces continuous integration.
- Use stacked PRs for complex features — break into smaller, mergeable increments.

### Rule 4: Feature Flags for Incomplete Work

- Incomplete features are merged to main behind a feature flag (runtime toggle).
- The feature is deployed but disabled. When ready, flip the flag without a new deployment.
- Feature flags should be short-lived — remove the flag code within one sprint after activation.
- Use Spring Cloud Feature Flags, LaunchDarkly, or a simple `@ConditionalOnProperty` toggle.

### Rule 5: Release Branches Only for Versions

- For versioned releases (mobile apps, SDKs, libraries), cut a release branch from main at the point of release.
- Cherry-pick critical fixes to the release branch. Do not develop on release branches.
- For SaaS/continuous deployment, no release branches needed — main IS the release.

## Comparison: TBD vs GitFlow

| Dimension | Trunk-Based Development | GitFlow |
|---|---|---|
| Branch lifespan | Hours to 2 days | Days to weeks |
| Integration frequency | Multiple times per day | End of feature cycle |
| Merge conflicts | Rare, small | Frequent, painful |
| CI/CD compatibility | Native fit | Requires workarounds |
| Suitable for | Web apps, SaaS, microservices | Desktop software, SDK with versioned releases |
| Risk per commit | Low (small batches) | High (large diffs) |
| DORA metrics | Enables elite performance | Hinders deployment frequency |

## Prerequisites

Before adopting TBD, ensure these are in place:

1. **Fast CI pipeline (< 10 minutes)** — developers cannot wait 30 minutes for feedback.
2. **Comprehensive test suite** — automated tests must catch regressions before reaching main.
3. **Code review within 4 hours** — reviews cannot block merges for days.
4. **Feature flags** — incomplete work must be deployable behind toggles.
5. **Team discipline** — small, clean commits over large, dramatic ones.

## Anti-Patterns

- Long-lived feature branches with weeks of work — defeats CI. Use feature flags and iterate in main.
- No feature flags for incomplete work — code sits on branches waiting for completion. Break work into mergable increments.
- Release branches used as integration branches — cherry-pick only critical fixes; do not develop on release branches.
- Merging directly to main without CI passing — every commit to main must be tested.
- Manual release process — releases should be automated from the trunk (semantic-release, release-please).
- One developer owning a branch for days — pair or mob to merge faster.

## Examples

### Short-Lived Branch Workflow

```bash
# 1. Start from updated main
git checkout main && git pull

# 2. Create short-lived branch
git checkout -b feat/123-add-address-verification

# 3. Make focused commits
git commit -m "feat(customer): add address verification domain model"
git commit -m "feat(customer): implement address lookup use case"
git commit -m "test(customer): add integration tests for address lookup"

# 4. Open PR, get review, merge within 24 hours
git push -u origin feat/123-add-address-verification
# Open PR → review → squash-merge to main
```

### Feature Flag Configuration

```java
@Configuration
@ConditionalOnProperty(name = "features.address-verification", havingValue = "true")
public class AddressVerificationConfig {
    @Bean
    public AddressVerifier addressVerifier() {
        return new ExternalApiAddressVerifier();
    }
}

// application.yml
features:
  address-verification: false  # disabled in production, enabled in canary
```
