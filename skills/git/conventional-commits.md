# Conventional Commits

## Purpose

Standardize commit message format to enable automated changelog generation, semantic versioning, and release notes. Integrates with `semantic-release`, `release-please`, and commitlint.

## When to Use

- Every commit in every Spring Boot service repository.
- Required for all playbooks: create-service, add-feature, fix-cve, upgrade-java, upgrade-spring.
- Used by the release-engineer agent to generate release notes from commit history.

## Best Practices

### Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type Reference and SemVer Mapping

| Type | Description | SemVer Bump | Notes |
|---|---|---|---|
| `feat` | New feature | MINOR (1.x → 1.x+1) | Correlates with SemVer MINOR |
| `fix` | Bug fix | PATCH (1.0.x → 1.0.x+1) | Correlates with SemVer PATCH |
| `feat!:` or `fix!:` | Breaking change | MAJOR (1.x → 2.x) | Append `!` after type/scope |
| `BREAKING CHANGE:` | Breaking change footer | MAJOR | Use in footer for long explanations |
| `perf` | Performance improvement | PATCH | Benchmark data preferred in body |
| `refactor` | Code change (no feature/fix) | No bump | Should not change behavior |
| `docs` | Documentation only | No bump | README, ADRs, CHANGELOG |
| `style` | Formatting, whitespace | No bump | No logic change |
| `test` | Add or update tests | No bump | Tests, fixtures, test config |
| `chore` | Maintenance | No bump | Dependencies, tooling, CI |
| `ci` | CI configuration | No bump | Workflow, pipeline changes |
| `build` | Build system | No bump | Maven/Gradle/Webpack config |
| `revert` | Revert a commit | PATCH | Include SHA of reverted commit |

### Automated Versioning with semantic-release or release-please

Tools that read Conventional Commits and automate releases:

```bash
# Using semantic-release (Node-based)
npx semantic-release

# Using release-please (GitHub Action)
# .github/workflows/release-please.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: simple
          target-branch: main
```

When a Release PR is merged:
1. CHANGELOG.md is updated automatically
2. Version is bumped in pom.xml/build.gradle
3. Git tag is created (v1.2.3)
4. GitHub Release is published

### Local Enforcement with commitlint + husky

```bash
# Install
npm init -y
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

# commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  }
};

# Enable husky hooks
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### Squash-Merge Strategy

When squash-merging PRs, the squash commit message becomes the canonical commit:

```
feat(customer): add address verification

Implements postal-code lookup via external API with 24h cache.

Closes #456
```

The PR title = the commit subject. The PR description = the commit body (after cleanup).

## Anti-Patterns

- `feat: fix stuff` — description must be meaningful and specific.
- Multiple unrelated changes in one commit — squash or split.
- `fix: wip` / `fix: more fixes` — use `git commit --amend` before pushing.
- No body for complex changes — a one-line commit is rarely sufficient for a 400-line PR.
- Using `chore` for everything — chore is for tooling and dependency updates, not features or fixes.
- Merge commits in release-triggered branches — semantic-release ignores merge commits; use squash-merge.

## Examples

```
feat(customer): add address lookup endpoint

Implements address verification via external API with caching.
Uses postal-code TTL of 24 hours.

Closes #456
```

```
fix!(payment): remove deprecated webhook v1 endpoint

BREAKING CHANGE: The /api/v1/payments/webhook endpoint is removed.
Migrate to /api/v2/payments/webhook.

Closes #789
```

```
security(auth): upgrade spring-security to 7.2.1

Fixes CVE-2026-1234 in OAuth2 resource server configuration.

Closes #101
```
