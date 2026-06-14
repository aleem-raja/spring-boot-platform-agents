# OpenRewrite

## Purpose

Apply automated, AST-level source code transformations for Java version upgrades, Spring Boot version upgrades, dependency migrations, and code style standardization.

## When to Use

- Java version upgrades (17 → 21, 21 → 25).
- Spring Boot version upgrades (3.x → 4.0).
- Framework migrations (JUnit 4 → 5, Mockito 4 → 5, Jakarta EE 9 → 11).
- Automated deprecation remediation across large codebases.
- Consistent application of coding standards (import ordering, annotation placement).

## Best Practices

- Run OpenRewrite as a Maven/Gradle plugin in a dedicated branch — never on main.
- Use `rewrite:dryRun` first to preview changes before applying.
- Review all changes: OpenRewrite is AST-safe but sometimes produces suboptimal formatting.
- Add `.mvn/maven.config` with `-Drewrite.activeRecipes=...` for team-wide recipe configuration.
- Run tests after applying recipes — OpenRewrite does not change semantics, but dependency upgrades can introduce behavioral changes.
- Combine recipes: `UpgradeToJava25` + `UpgradeSpringBoot_4_0` for simultaneous migrations (but run them sequentially).
- Commit OpenRewrite configuration files to version control so the migration is reproducible.

## Anti-Patterns

- Applying recipes without dry-run — always preview changes first.
- Running OpenRewrite on a dirty working tree — commit or stash changes before running.
- Skipping test execution after applying recipes — OpenRewrite is not a replacement for CI/CD verification.
- Applying breaking recipes without reviewing the diff — blindly applying changes can introduce subtle bugs.
- Using OpenRewrite for one-off refactors — use for repetitive, pattern-based migrations only.

## Examples

**Maven plugin:**
```xml
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <version>5.45.0</version>
    <configuration>
        <activeRecipes>
            <recipe>org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0</recipe>
            <recipe>org.openrewrite.java.migrate.UpgradeToJava25</recipe>
        </activeRecipes>
    </configuration>
</plugin>
```

**Commands:**
```bash
# Preview changes
mvn rewrite:dryRun

# View diff
git diff

# Apply changes
mvn rewrite:run

# Run tests after migration
mvn verify
```

**Common migration recipes:**
| Recipe | Purpose |
|---|---|
| `org.openrewrite.java.migrate.UpgradeToJava25` | Java 21 → 25 language features |
| `org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0` | Spring Boot 3 → 4 |
| `org.openrewrite.java.testing.junit5.JUnit5BestPractices` | JUnit 4 → 5 migration |
| `org.openrewrite.java.migrate.javax.JavaxToJakarta` | Jakarta EE 9 migration |
| `org.openrewrite.java.format.AutoFormat` | Apply code style consistently |
