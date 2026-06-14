# Upgrade Java Playbook

Upgrade a Spring Boot service from an older Java version (17, 21) to Java 25 LTS.

## Required Agents

- architect — plan upgrade scope and technology impact
- implementation-engineer — apply code migrations
- test-engineer — verify application behavior after upgrade
- performance-engineer — benchmark performance changes

## Required Skills

- `skills/modernization/upgrade-java` — Java upgrade best practices
- `skills/modernization/openrewrite` — automated migration
- `skills/java/java25-modern` — new language features to adopt
- `skills/testing/integration-testing` — verify after migration

## Workflow

1. **architect: Assess upgrade impact**
   - Identify all services using the old Java version
   - Review dependency compatibility with Java 25
   - Identify deprecated APIs in current codebase
   - Create ADR documenting the upgrade decision

2. **implementation-engineer: Apply OpenRewrite recipe**
   - Run `UpgradeToJava25` recipe with dry-run first
   - Review and commit changes
   - Update Maven/Gradle configuration (source/target 25, --release 25)

3. **implementation-engineer: Adopt new language features**
   - Enable virtual threads (`spring.threads.virtual.enabled=true`)
   - Replace legacy patterns with records, sealed types, pattern matching
   - Update virtual thread usage in blocking I/O paths

4. **test-engineer: Run full test suite**
   - Run unit tests, integration tests, API contract tests
   - Verify Testcontainers work with Java 25
   - Run E2E tests against full service stack

5. **performance-engineer: Benchmark performance**
   - Measure throughput and latency before/after upgrade
   - Verify Compact Object Headers memory reduction
   - Compare GC behavior between versions

6. **architect: Approve production rollout**
   - Review test results and benchmark data
   - Verify all services are compatible
   - Approve canary deployment

## Outputs

- Updated pom.xml/build.gradle with Java 25 config
- OpenRewrite recipe application log
- Benchmark comparison report (before/after)
- Updated container images with Java 25
- ADR documenting the upgrade
