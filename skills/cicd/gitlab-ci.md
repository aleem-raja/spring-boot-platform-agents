# GitLab CI

## Purpose

Automate build, test, security scan, and deployment pipelines using GitLab CI for Spring Boot services.

## When to Use

- Default CI/CD when source code is hosted on GitLab (self-managed or .com).
- Team prefers GitLab's integrated CI/CD with container registry, environments, and Pages.

## Best Practices

### Pipeline Structure

Use a DAG (directed acyclic graph) with `needs:` to run jobs as soon as their dependencies are met, bypassing strict stage ordering:

```yaml
stages:
  - build
  - test
  - security
  - package
  - deploy

variables:
  MAVEN_OPTS: "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"
  MAVEN_CLI_OPTS: "-B -V --no-transfer-progress"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .m2/repository/
  policy: pull-push

build:
  stage: build
  script:
    - mvn compile $MAVEN_CLI_OPTS
  artifacts:
    paths:
      - target/classes/

test:
  stage: test
  needs: ["build"]
  services:
    - postgres:17
  script:
    - mvn verify $MAVEN_CLI_OPTS
  artifacts:
    reports:
      junit: target/surefire-reports/TEST-*.xml

security-sast:
  stage: security
  needs: ["build"]
  script:
    - mvn org.owasp:dependency-check-maven:check $MAVEN_CLI_OPTS

package:
  stage: package
  needs: ["test", "security-sast"]
  script:
    - mvn package -DskipTests $MAVEN_CLI_OPTS
  artifacts:
    paths:
      - target/*.jar
```

### Use `rules:` Over `only:/except:`

```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_COMMIT_TAG'

deploy-production:
  stage: deploy
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
      allow_failure: false
  environment:
    name: production
  script:
    - kubectl set image deployment/customer-service app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### Secure Docker Builds with Kaniko

Use Kaniko instead of Docker-in-Docker (DinD) for security — no privileged mode needed:

```yaml
build-image:
  stage: package
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
      --cache=true
```

### Cache Optimization

Key cache by lockfile hash, not branch name. Invalidate only when dependencies change, not on every commit:

```yaml
.compute-cache-key:
  stage: .pre
  image: alpine:latest
  script:
    - sha256sum pom.xml > .cache-key
  artifacts:
    paths:
      - .cache-key
    expire_in: 1 hour

build:
  cache:
    key:
      files:
        - pom.xml
    paths:
      - .m2/repository/
    policy: pull-push
```

For downstream jobs that only read the cache (they never produce new .m2 content), set `policy: pull` to avoid redundant uploads:

```yaml
test:
  cache:
    key:
      files:
        - pom.xml
    paths:
      - .m2/repository/
    policy: pull
```

### Security Scanning

Include GitLab's built-in security templates:

```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/Secret-Detection.gitlab-ci.yml

sast:
  stage: security
dependency_scanning:
  stage: security
secret_detection:
  stage: security
```

### Manual Approval Gates

Require human approval before production deployment:

```yaml
deploy-production:
  stage: deploy
  when: manual
  allow_failure: false
  environment:
    name: production
    url: https://api.example.com
  script:
    - echo "Deploying $CI_COMMIT_SHA to production"
  needs: ["build-image"]
```

### Pipeline-level Duplicate Prevention

Prevent duplicate pipelines when the same commit triggers both a branch push and a merge request event:

```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS'
      when: never
    - if: '$CI_COMMIT_BRANCH'
```

## Anti-Patterns

- Using `only:/except:` keywords (deprecated) — use `rules:` for all pipeline conditions.
- Running Docker-in-Docker in shared runners — use Kaniko for secure builds without privileged mode.
- Cache keyed only by branch name — invalidates on every commit even without dependency changes.
- No `needs:` declarations — every job waits for the entire previous stage to complete.
- Secrets hardcoded in `.gitlab-ci.yml` — use CI/CD variables (masked + protected).
- No `workflow:rules:` — duplicate pipelines waste runner time.

## Examples

See the complete example at `examples/cicd/.gitlab-ci.yml` (planned).
