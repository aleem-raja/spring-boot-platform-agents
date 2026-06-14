# Testcontainers

## Purpose

Run integration tests with real infrastructure dependencies (PostgreSQL, Kafka, Redis) using disposable Docker containers.

## When to Use

- Every integration test that touches a database, message broker, or external service.
- Required for all persistence-layer tests (JPA repositories, Flyway migrations).
- Required for all messaging tests (Kafka producers/consumers).
- Use over H2 or embedded databases for production-faithful testing.

## Best Practices

- Use Testcontainers 2.x (Spring Boot 4 compatible) via `testcontainers-bom`.
- Use `@Testcontainers` class-level annotation with `@Container` for shared container lifecycle.
- Use `@ServiceConnection` to auto-configure the application's database connection from a Testcontainers container.
- Use `@DynamicPropertySource` for services not supported by `@ServiceConnection`.
- Use reusable containers (`withReuse(true)`) for local development speed.
- Define container images with explicit tags (never `latest`) for deterministic builds.
- Dispose containers in `@AfterAll` or use `@Testcontainers` default lifecycle management.
- Set resource limits on containers (`withCreateContainerCmdModifier`) in CI environments.

## Anti-Patterns

- Using H2 in-memory database for PostgreSQL compatibility — H2 does not match PostgreSQL behavior exactly.
- Starting a new container for every test class — share containers at the test suite level (singleton container pattern).
- Forgetting to configure `@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)` for constructor injection in tests.
- Hardcoding container ports — use `getMappedPort()` for dynamic port mapping.
- Not setting `TC_REUSABLE=true` environment variable — prevents container reuse in local development.
- Running Testcontainers without Docker in CI — ensure Docker socket is available.

## Examples

**PostgreSQL integration test:**
```java
@SpringBootTest
@Testcontainers
class CustomerRepositoryTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector:pg17");

    @Autowired
    private CustomerRepository repository;

    @Test
    void shouldSaveAndFindCustomer() {
        var customer = new Customer("test@example.com", "Test User");
        var saved = repository.save(customer);
        var found = repository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }
}
```

**Singleton container pattern:**
```java
abstract class AbstractIntegrationTest {
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
        .withReuse(true);

    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    ).withReuse(true);

    static {
        postgres.start();
        kafka.start();
    }
}
```
