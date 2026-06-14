# Spring Boot 4

## Purpose

Develop Spring Boot 4 services using modular JARs, Spring Framework 7, Jakarta EE 11, and Java 25 features with consistent patterns for configuration, testing, and production operations.

## When to Use

- Default framework for all services in this platform.
- Required for every playbook that generates or modifies service code.
- Use with Spring Boot 4.0+ and Spring Framework 7.x.

## Best Practices

### Modular Starters

Spring Boot 4 splits monolithic starters into focused modules. Import only what you need:

```xml
<!-- Instead of spring-boot-starter-web, pick specific modules: -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <!-- Replace Tomcat with Undertow or use WebFlux for virtual threads -->
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

### Configuration Properties

Use `@ConfigurationProperties` with `@ConstructorBinding` on records for type-safe, immutable configuration:

```java
@ConfigurationProperties("order")
public record OrderProperties(
    PaymentProvider paymentProvider,
    int maxItemsPerOrder,
    Duration defaultTimeout,
    List<String> supportedCurrencies
) {
    public record PaymentProvider(String name, String endpoint) {}
}

// Enable with:
@EnableConfigurationProperties(OrderProperties.class)
```

### Declarative HTTP Clients

```java
@HttpExchange("/api/v1/inventory")
public interface InventoryClient {
    @GetExchange("/stock/{sku}")
    StockResponse checkStock(@PathVariable String sku);

    @PostExchange("/reserve")
    ReservationResponse reserve(@RequestBody ReserveRequest request);
}

// Create client:
@Bean
public InventoryClient inventoryClient(RestClient.Builder builder) {
    var restClient = builder.baseUrl("http://inventory-service").build();
    return HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(restClient))
        .build()
        .createClient(InventoryClient.class);
}
```

### Testing Slices

Use slice tests to load only the Spring context you need:

```java
@WebMvcTest(CustomerController.class)
class CustomerControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean  // Boot 4 — replaces @MockBean
    private CustomerService service;

    @Test
    void shouldReturnCustomer() throws Exception {
        when(service.findById(any())).thenReturn(new CustomerResponse(...));
        mockMvc.perform(get("/api/v1/customers/{id}", UUID.randomUUID()))
            .andExpect(status().isOk());
    }
}

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)  // Use Testcontainers, not H2
class CustomerRepositoryTest {
    @Autowired
    private CustomerRepository repository;

    @Container
    @ServiceConnection  // Boot 4 — auto-configures datasource from container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");
}
```

### Slice Test Reference

| Annotation | Loads | When to Use |
|---|---|---|
| `@WebMvcTest` | Controller layer only | Controller logic, security, serialization |
| `@DataJpaTest` | JPA repositories only | Repository queries, entity mapping |
| `@JsonTest` | Jackson/GSON only | JSON serialization/deserialization |
| `@RestClientTest` | REST client only | Declarative HTTP client testing |
| `@WebFluxTest` | WebFlux controllers | Reactive controller testing |
| `@SpringBootTest` | Full application context | End-to-end flows |

### Profiles

```yaml
# application.yml (defaults for all profiles)
spring:
  jpa:
    open-in-view: false

---
# application-dev.yml
spring:
  devtools:
    restart:
      enabled: true
  jpa:
    show-sql: true
  datasource:
    hikari:
      maximum-pool-size: 5

---
# application-docker.yml
spring:
  datasource:
    url: jdbc:postgresql://db:5432/service
  kafka:
    bootstrap-servers: kafka:9092

---
# application-cloud.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
```

Profile hierarchy: `application.yml` (base) → profile-specific (`application-{profile}.yml`) → `@TestPropertySource` → `@DynamicPropertySource` (tests).

### Startup Optimization

```yaml
spring:
  main:
    lazy-initialization: false  # default in Boot 4 — fail fast on missing deps
    allow-circular-references: false
  jpa:
    hibernate:
      ddl-auto: validate  # never update/create in production
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

### Graceful Shutdown

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

This waits for in-flight requests to complete before shutting down. Configure `tomcat.connection-timeout` or undertow equivalent for slow clients.

### Custom Health Indicators

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    @Override
    public Health health() {
        try (var conn = dataSource.getConnection()) {
            if (conn.isValid(1000)) {
                return Health.up().build();
            }
            return Health.down().withDetail("database", "unreachable").build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

## Anti-Patterns

- Using `spring-boot-starter-web` as a single dependency — import only what you need.
- Using `@Value` for configuration binding — use `@ConfigurationProperties` with records.
- Using `RestTemplate` — it will be deprecated. Use `RestClient` or declarative HTTP interfaces.
- Using field injection with `@Autowired` — use constructor injection with records or final fields.
- Ignoring JSpecify null warnings — configure `-Werror:null` in the compiler.
- Using `spring.factories` for auto-configuration — use `AutoConfiguration.imports` (required since Boot 3, valid in Boot 4).
- `@SpringBootTest` for every test — use slice tests (`@WebMvcTest`, `@DataJpaTest`) for faster feedback.
- `spring.jpa.open-in-view=true` (default) — disable OSIV to prevent Hibernate session in view layer.

## Application Checklist

- `@ConfigurationProperties` with records for all configuration groups
- `RestClient` or declarative HTTP interfaces for all HTTP calls
- Slice tests where possible (`@WebMvcTest`, `@DataJpaTest`, `@JsonTest`)
- Virtual threads enabled (`spring.threads.virtual.enabled=true`)
- Graceful shutdown configured
- `spring.jpa.open-in-view=false`
- Custom health indicators for critical dependencies
- Profile-specific configuration for dev/docker/cloud
- Modular starters (not monolithic `spring-boot-starter-web`)
- `spring.main.lazy-initialization=false` for fail-fast startup
