# Upgrade Spring Boot

## Purpose

Migrate Spring Boot services from older versions (3.x) to Spring Boot 4.x using automated migrations and manual verification.

## When to Use

- Required by the upgrade-spring playbook.
- Use when the current Spring Boot version reaches end of support (Boot 3.x EOL end of 2026).
- Use when migrating from Spring Boot 3.5 to 4.0 in a phased approach.

## Best Practices

1. **Stabilize on latest 3.5.x** — Fix all deprecation warnings. Run with `-Xlint:all` to catch deprecated API usage.
2. **Upgrade to Spring Boot 4.0** — Bump the parent/BOM version. Add compatibility bridge starter first.
3. **Run Spring Boot 4 OpenRewrite recipe** — `org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0` for automated migration.
4. **Address modular jar changes** — `spring-boot-autoconfigure` is now modular. Update custom starter imports to reference specific modules.
5. **Update Jackson 3 usage** — `JacksonException` is now `RuntimeException`. Audit catch blocks for correct exception type.
6. **Update Security configuration** — Replace `authorizeRequests()` with `authorizeHttpRequests()`. Explicitly disable CSRF for stateless APIs.
7. **Enable virtual threads** — Set `spring.threads.virtual.enabled=true`.
8. **Use JSpecify annotations** — Add `@NullMarked` to `package-info.java` and resolve null warnings.

## Anti-Patterns

- Upgrading Java and Spring Boot simultaneously — upgrade Java first (to 25), then Spring Boot (to 4.0).
- Skipping the 3.5.x stabilization step — deprecation warnings accumulate; running the upgrade recipe on a dirty codebase produces incomplete results.
- Using `spring-boot-starter-web` monolithic dependency — use specific module starters in Boot 4.
- Ignoring Jackson 3 exception type change — code catching `JsonProcessingException` will not catch `JacksonException` subclasses in Java 25 runtime behavior.
- Not updating `spring.factories` to `AutoConfiguration.imports` — custom auto-configurations silently disabled.

## Examples

**Maven upgrade:**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.0</version>
</parent>
```

**OpenRewrite recipe:**
```xml
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <configuration>
        <activeRecipes>
            <recipe>org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0</recipe>
        </activeRecipes>
    </configuration>
</plugin>
```

**Security config migration (Boot 3 → 4):**
```java
// Before (Boot 3):
http.authorizeRequests()
    .antMatchers("/api/public/**").permitAll()
    .anyRequest().authenticated();

// After (Boot 4):
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/public/**").permitAll()
    .anyRequest().authenticated()
);
```

**Jackson 3 exception handling:**
```java
// Before:
try { mapper.readValue(json, Order.class); }
catch (JsonProcessingException e) { ... }

// After (JacksonException is now RuntimeException):
try { mapper.readValue(json, Order.class); }
catch (JacksonException e) { ... }
```
