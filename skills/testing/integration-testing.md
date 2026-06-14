# Integration Testing

## Purpose

Verify that service components work together correctly with real infrastructure (database, message broker, external APIs) using Testcontainers for production-like environments.

## When to Use

- Testing persistence layer with real database (always use Testcontainers, never H2).
- Testing message producers and consumers with real message broker.
- Testing HTTP clients against wiremock or Testcontainers-based mock services.
- Testing complete request-response flow with `@SpringBootTest`.

## Best Practices

### Container Lifecycle

```java
// Shared container per class (preferred)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class CustomerServiceIntegrationTest {
    @Container
    @ServiceConnection  // Boot 4 — auto-configures datasource
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.9.0")
    );

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private CustomerRepository repository;

    @Test
    void shouldCreateAndRetrieveCustomer() {
        var request = new CreateCustomerRequest("test@example.com", "Test User");
        var createdId = webTestClient.post()
            .uri("/api/v1/customers")
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(UUID.class)
            .returnResult().getResponseBody();

        assertThat(createdId).isNotNull();
        assertThat(repository.findById(createdId)).isPresent();
    }
}
```

### Test Slices

Use slice tests for faster feedback:

```java
@WebMvcTest(CustomerController.class)
class CustomerControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean  // Boot 4
    private CustomerService service;

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        when(service.findById(any())).thenThrow(new ResourceNotFoundException("Customer", UUID.randomUUID()));
        mockMvc.perform(get("/api/v1/customers/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.title").value("Resource not found"));
    }
}

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class CustomerRepositoryTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private CustomerRepository repository;

    @Test
    void shouldFindByEmail() {
        repository.save(new Customer("test@example.com", "Test"));
        assertThat(repository.findByEmail("test@example.com")).isPresent();
    }
}
```

### Test Data Management

```java
// Use ObjectMother for test fixtures
public class TestData {
    public static Customer aCustomer() {
        return new Customer("test@example.com", "Test User");
    }

    public static CreateCustomerRequest aCreateRequest() {
        return new CreateCustomerRequest("new@example.com", "New User");
    }

    public static List<Customer> someCustomers(int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> new Customer("user" + i + "@example.com", "User " + i))
            .toList();
    }
}

// Clean data between tests
@BeforeEach
void setUp(@Autowired CustomerRepository repository) {
    repository.deleteAll();
}
```

### Kafka Integration Test

```java
@SpringBootTest
@Testcontainers
class OrderEventIntegrationTest {
    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.9.0")
    );

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventHandler handler;

    @Test
    void shouldProcessOrderPlacedEvent() {
        var event = new OrderPlacedEvent(UUID.randomUUID(), "SKU-001", 2);
        kafkaTemplate.send("order.events", event.orderId().toString(), event);

        await().atMost(Duration.ofSeconds(5))
            .untilAsserted(() ->
                assertThat(handler.getProcessedEvents()).contains(event.orderId())
            );
    }
}
```

### Testing Error Scenarios

```java
@Test
void shouldHandleDatabaseConnectionFailure() {
    // Stop container to simulate failure
    postgres.stop();
    webTestClient.get()
        .uri("/api/v1/customers")
        .exchange()
        .expectStatus().is5xxServerError();
    postgres.start();  // Restart for subsequent tests
}

@Test
void shouldReturn503WhenDownstreamUnavailable() {
    wiremock.stubFor(get(urlPathMatching("/api/v1/inventory/stock/.*"))
        .willReturn(aResponse().withStatus(503)));
    // Expect circuit breaker fallback or graceful degradation
}
```

### Testcontainers Singleton Factory

```java
// Avoid multiple container startups across test classes
public abstract class AbstractIntegrationTest {
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.9.0")
    );

    static {
        postgres.start();
        kafka.start();
        System.setProperty("spring.datasource.url", postgres.getJdbcUrl());
        System.setProperty("spring.datasource.username", postgres.getUsername());
        System.setProperty("spring.datasource.password", postgres.getPassword());
        System.setProperty("spring.kafka.bootstrap-servers", kafka.getBootstrapServers());
    }
}

// Extend in test classes
class CustomerRepositoryTest extends AbstractIntegrationTest { ... }
class OrderEventTest extends AbstractIntegrationTest { ... }
```

### CI Best Practices

```yaml
# Maven profile for integration tests
# mvn verify -Pintegration-test
# Use Testcontainers with Ryuk (reaper) for automatic container cleanup
# Set TESTCONTAINERS_RYUK_DISABLED=false in CI
# Set TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE for DinD
```

## Anti-Patterns

- Using H2 for PostgreSQL integration tests — H2 diverges in SQL dialect, function support, and transaction behavior. Always use Testcontainers with the production database image.
- Mocking the database layer — defeats the purpose of an integration test. Use Testcontainers.
- Shared mutable test data — each test class should clean up after itself or use `@Transactional` rollback.
- Flaky tests from container state — use fresh containers per test class or reset data between tests.
- Starting a new container per test method — share containers at the class or suite level.
- Ignoring container startup time — use `@Testcontainers` annotations and `@Container` for lifecycle management.
- Testing everything with `@SpringBootTest` — use slice tests for focused concerns; reserve full context for end-to-end flows.

## Application Checklist

- Testcontainers for PostgreSQL (never H2)
- Testcontainers for Kafka (if service uses messaging)
- `@WebMvcTest` for controller slice tests
- `@DataJpaTest` for repository slice tests
- `@SpringBootTest` for end-to-end flows
- `@ServiceConnection` for auto-configured containers
- Test data factories  (ObjectMother pattern)
- Error scenario tests (DB down, downstream timeout, circuit breaker open)
- Awaitility for async assertions (Kafka, events)
- Flyway migration tested against real PostgreSQL
