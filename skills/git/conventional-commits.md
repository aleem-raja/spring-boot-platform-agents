# Conventional Commits

## Purpose

Standardize commit message format to enable automated changelog generation, semantic versioning, and release notes.

## When to Use

- Every commit in every Spring Boot service repository.
- Required for all playbooks: create-service, add-feature, fix-cve, upgrade-java, upgrade-spring.
- Used by the release-engineer agent to generate release notes from commit history.

## Best Practices

- Format: `<type>(<scope>): <description>` where type is one of: feat, fix, chore, docs, style, refactor, perf, test, security.
- Use imperative mood: "add" not "added", "fix" not "fixed".
- Scope should match module or bounded context name.
- Breaking changes: append `!` after type/scope, or add `BREAKING CHANGE:` footer.
- Body explains motivation, not implementation. Why, not what.
- Footer references issues: `Closes #123`, `Refs #456`.
- Keep description under 72 characters, wrap body at 72 characters.

## Anti-Patterns

- `feat: fix stuff` — description must be meaningful and specific.
- Multiple unrelated changes in one commit — squash or split.
- `fix: wip` / `fix: more fixes` — use `git commit --amend` before pushing.
- No body for complex changes — a one-line commit is rarely sufficient for a 400-line PR.
- Using chore for everything — chore is for tooling and dependency updates, not features or fixes.

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

```
chore(deps): bump testcontainers from 1.20.0 to 1.21.0
```
