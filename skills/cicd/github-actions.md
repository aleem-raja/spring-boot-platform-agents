# GitHub Actions

## Purpose

Automate build, test, security scan, and deployment pipelines using GitHub Actions for Spring Boot services.

## When to Use

- Default CI/CD choice when source code is hosted on GitHub.
- Use for all service repositories in a GitHub-based organization.
- Use for matrix builds (multiple JDK versions, multiple OS targets).

## Best Practices

- Pin action versions to full-length SHAs, not version tags (security against supply-chain attacks).
- Use `actions/cache` for Maven `.m2/repository` or Gradle cache with `cache: maven`.
- Split workflows: CI (build+test), CD (deploy), Security (trivy/codeql), Release (publish artifacts).
- Use OIDC for cloud provider authentication (no long-lived secrets).
- Use matrix builds for parallel test execution across JDK versions.
- Fail fast on compile errors: `mvn compile -B -q` before running tests.
- Use `dorny/test-reporter` for readable test result annotations on PRs.

## Anti-Patterns

- Installing Maven/Gradle on every run instead of using `actions/setup-java` with cache.
- Running integration tests without Testcontainers — use service containers or Testcontainers only.
- Storing production secrets in repository secrets without audit logging.
- Single gigantic workflow file — split by concern.
- Not cancelling in-progress runs on new commits to the same branch.

## Examples

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 25
          distribution: temurin
          cache: maven
      - run: mvn verify -B
```
