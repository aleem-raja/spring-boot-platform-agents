# Spring Boot 4

## Purpose

Develop Spring Boot 4 services using modular JARs, Spring Framework 7, Jakarta EE 11, and Java 25 features.

## When to Use

- Default framework for all services in this platform.
- Required for every playbook that generates or modifies service code.
- Use with Spring Boot 4.0+ and Spring Framework 7.x.

## Best Practices

- Use the modular starter approach: import only the specific module starters instead of `spring-boot-starter-web`. Spring Boot 4 splits monolithic starters into focused modules.
- Use `@SpringBootApplication` with explicit `@EnableAutoConfiguration` for production clarity.
- Use `@ConfigurationProperties` with `@ConstructorBinding` on records for type-safe, immutable configuration.
- Use `RestClient` (Spring Framework 7) over `RestTemplate` for synchronous HTTP calls.
- Use `HttpServiceProxyFactory` for declarative HTTP interfaces instead of manual `RestClient` usage.
- Use `@NullMarked` on `package-info.java` with JSpecify annotations for compile-time null safety.
- Use `spring.main.lazy-initialization=false` (default in Boot 4) — eager init catches config errors at startup.
- Enable virtual threads: `spring.threads.virtual.enabled=true` (default on Java 21+).
- Use `spring-boot-starter-actuator` for health checks, metrics, and startup profiling.

## Anti-Patterns

- Using `spring-boot-starter-web` as a single dependency — import only what you need.
- Using `@Value` for configuration binding — use `@ConfigurationProperties` with records.
- Using `RestTemplate` — it will be deprecated. Use `RestClient` or declarative HTTP interfaces.
- Using field injection with `@Autowired` — use constructor injection with records or final fields.
- Ignoring JSpecify null warnings — configure `-Werror:null` in the compiler.
- Using `spring.factories` for auto-configuration — use `AutoConfiguration.imports` (required since Boot 3, still valid in Boot 4).

## Examples

**application.yml:**
```yaml
spring:
  application:
    name: customer-service
  threads:
    virtual:
      enabled: true
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false
```

**Configuration properties:**
```java
@ConfigurationProperties("customer")
public record CustomerProperties(
    String defaultRegion,
    int maxAddressesPerCustomer,
    Duration cacheTtl
) {}

// Enable with:
// @EnableConfigurationProperties(CustomerProperties.class)
```

**Declarative HTTP client:**
```java
@HttpExchange("/api/v1/orders")
public interface OrderServiceClient {
    @GetExchange("/{orderId}")
    OrderResponse getOrder(@PathVariable UUID orderId);
}
```
