# Upgrade Java

## Purpose

Migrate Spring Boot services from older Java versions (17, 21) to Java 25 LTS using automated migrations and manual verification.

## When to Use

- Required by the upgrade-java playbook.
- Use when the current Java version reaches end of support or when language features in a newer version improve code quality or performance.
- Use for Java 21 → 25 migration (the most common upgrade path).

## Best Practices

1. **Stabilize on current version first** — Fix all deprecation warnings before starting the upgrade.
2. **Use OpenRewrite for automated migration** — Apply the `UpgradeToJava25` recipe for safe, AST-level transformations.
3. **Update build configuration** — Set `maven-compiler-plugin` source/target to 25, update `toolchain` configuration.
4. **Adopt new language features gradually** — Enable records, sealed types, pattern matching, and switch expressions in new code first; update existing code incrementally.
5. **Enable virtual threads** — Set `spring.threads.virtual.enabled=true` (automatic on Java 21+ in Boot 4).
6. **Update CI/CD** — Change JDK distribution in CI/CD pipelines to eclipse-temurin:25 or equivalent.
7. **Performance testing** — Java 25 introduces Compact Object Headers (~22% heap reduction). Verify memory improvements in staging.

## Anti-Patterns

- Upgrading Java and Spring Boot simultaneously — upgrade one at a time to isolate breaking changes.
- Enabling every new language feature at once — introduce features incrementally over multiple sprints.
- Not updating container images — base Docker images must use Java 25 JRE; old images cause runtime errors.
- Skipping `--release 25` flag — cross-compilation against older APIs may cause runtime `NoSuchMethodError`.
- Not testing with production-like data volume — heap reduction from Compact Object Headers may reveal memory leaks masked by over-provisioning.

## Examples

**Maven upgrade:**
```xml
<properties>
    <java.version>25</java.version>
    <maven.compiler.source>25</maven.compiler.source>
    <maven.compiler.target>25</maven.compiler.target>
</properties>

<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <release>25</release>
        <parameters>true</parameters>
    </configuration>
</plugin>
```

**OpenRewrite recipe:**
```xml
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <configuration>
        <activeRecipes>
            <recipe>org.openrewrite.java.migrate.UpgradeToJava25</recipe>
        </activeRecipes>
    </configuration>
</plugin>
```

**New Java 25 patterns to adopt:**
```java
// Record pattern (Java 21+)
if (obj instanceof Point(int x, int y)) {
    // use x, y directly
}

// Sealed interface pattern matching
sealed interface Shape permits Circle, Rectangle {}
switch (shape) {
    case Circle c -> computeArea(c.radius());
    case Rectangle r -> computeArea(r.width(), r.height());
}

// Unnamed variables (Java 22+)
try (var _ = fileWriter) { }

// Virtual thread executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> processOrder(orderId));
}
```
