# Upgrade Spring Playbook

Upgrade a Spring Boot service from Spring Boot 3.x to Spring Boot 4.0.

## Required Agents

- architect — plan upgrade scope and breaking change impact
- implementation-engineer — apply code migrations and module structure changes
- test-engineer — verify application behavior after upgrade
- performance-engineer — validate performance characteristics
- security-engineer — verify security configuration changes

## Required Skills

- `skills/modernization/upgrade-spring` — Spring Boot 4 upgrade best practices
- `skills/modernization/openrewrite` — automated migration
- `skills/spring/spring-boot4` — new Spring Boot 4 patterns
- `skills/security/oauth2-jwt` — security configuration changes
- `skills/testing/integration-testing` — verify after migration

## Workflow

1. **architect: Assess upgrade impact**
   - Verify Java 25 is already in use (upgrade Java first if not)
   - Identify custom starters and auto-configurations affected by modular JARs
   - Review security configuration for breaking changes
   - Create ADR documenting the upgrade decision

2. **implementation-engineer: Stabilize on latest 3.5.x**
   - Upgrade to latest Spring Boot 3.5.x release
   - Fix all deprecation warnings
   - Run `-Xlint:all` to catch all warnings

3. **implementation-engineer: Apply OpenRewrite recipe**
   - Run `UpgradeSpringBoot_4_0` recipe with dry-run first
   - Review and commit changes
   - Update parent/BOM version to 4.0.0

4. **implementation-engineer: Address breaking changes**
   - Update Security config: `authorizeHttpRequests()` over `authorizeRequests()`
   - Update Jackson 3 exception handling
   - Update `spring.factories` to `AutoConfiguration.imports`
   - Switch to modular starters (replace `spring-boot-starter-web`)
   - Enable virtual threads

5. **test-engineer: Run full test suite**
   - Run all tests (unit, integration, API, E2E)
   - Verify Testcontainers work with Boot 4
   - Verify Jackson serialization behavior

6. **security-engineer: Verify security configuration**
   - Confirm CSRF is correctly configured for stateless APIs
   - Verify OAuth2 resource server configuration
   - Verify CORS policy behavior

7. **performance-engineer: Benchmark performance**
   - Measure startup time improvement from modular JARs
   - Compare throughput and memory usage
   - Verify virtual thread performance

8. **architect: Approve production rollout**
   - Review test results and benchmark data
   - Verify all dependencies are compatible
   - Approve canary deployment

## Outputs

- Updated pom.xml/build.gradle with Boot 4.0
- OpenRewrite recipe application log
- Security configuration review report
- Benchmark comparison report
- ADR documenting the upgrade
