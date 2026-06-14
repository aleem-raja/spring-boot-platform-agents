# GitLab CI

## Purpose

Automate build, test, and deployment pipelines using GitLab CI for Spring Boot services hosted on GitLab.

## When to Use

- Alternative to GitHub Actions when source code is hosted on GitLab (self-managed or SaaS).
- Use when team prefers GitLab's integrated CI/CD with Auto DevOps or custom pipeline definitions.

## Best Practices

- Define pipeline as `.gitlab-ci.yml` in the repository root.
- Use GitLab CI templates to avoid duplicating pipeline definitions across services.
- Use `cache` for Maven `.m2/repository` with key based on `pom.xml` checksum.
- Use `artifacts` to pass built JARs between pipeline stages.
- Use GitLab container registry for storing Docker images.
- Use GitLab CI variables for environment-specific configuration (never commit secrets).
- Use `needs` keyword for DAG-style pipeline execution (parallel stages where possible).
- Use `rules` to conditionally run pipelines (skip docs-only changes, run security scans on main only).

## Anti-Patterns

- Running all jobs in a single sequential stage — use parallel jobs with DAG dependencies.
- Building Docker images inside a container without DinD (Docker-in-Docker) — use `docker:dind` service.
- Not caching Maven dependencies — every pipeline run re-downloads the internet.
- Hardcoding environment URLs — use CI/CD variables.
- Using `only`/`except` (deprecated) — use `rules` keyword instead.

## Examples

```yaml
image: maven:3.9-eclipse-temurin-25

variables:
  MAVEN_OPTS: "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"
  MAVEN_CLI_OPTS: "-B -V --no-transfer-progress"

cache:
  paths:
    - .m2/repository/
  key: $CI_COMMIT_REF_SLUG

stages:
  - build
  - test
  - security
  - package

build:
  stage: build
  script: mvn compile $MAVEN_CLI_OPTS
  artifacts:
    paths:
      - target/*.jar

test:
  stage: test
  services:
    - postgres:17
  script: mvn verify $MAVEN_CLI_OPTS
  artifacts:
    reports:
      junit: target/surefire-reports/TEST-*.xml

security:
  stage: security
  script:
    - mvn org.owasp:dependency-check-maven:check $MAVEN_CLI_OPTS
```
