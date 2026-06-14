# Integration Testing

## Purpose

Verify that service components work together correctly with real infrastructure (database, message broker, external APIs).

## When to Use

- Testing persistence layer with real database (always use Testcontainers, never H2).
- Testing message producers and consumers with real message broker.
- Testing HTTP clients against wiremock or Testcontainers-based mock services.
- Testing complete request-response flow with @SpringBootTest.

## Best Practices

- Use `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)` for full integration tests.
- Use `TestRestTemplate` or `WebTestClient` for HTTP request testing with real server.
- Use `@DynamicPropertySource` to override configuration with Testcontainers endpoints.
- Test error scenarios: database connection failure, message broker downtime, timeout.
- Test migration scripts: Flyway/Liquibase migrations must be validated against a real database.
- Use `@Sql` for test data setup and cleanup with SQL scripts.
- Run integration tests in a separate Maven/Gradle profile to keep build fast.

## Anti-Patterns

- Using H2 for PostgreSQL integration tests — H2 diverges from PostgreSQL in SQL dialect, function support, and transaction behavior.
- Mocking the database layer — defeats the purpose of an integration test. Use Testcontainers.
- Flaky tests from shared mutable state — each test must clean up after itself.
- Integration tests that do not fail on database connection errors — verify connectivity before running tests.
- Slow tests that start a new container per test method — share containers at the test class or suite level.

## Examples

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class CustomerApiIntegrationTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void shouldCreateAndRetrieveCustomer() {
        var request = new CreateCustomerRequest("test@example.com", "Test User");

        var createdId = webTestClient.post()
            .uri("/api/v1/customers")
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(UUID.class)
            .returnResult()
            .getResponseBody();

        webTestClient.get()
            .uri("/api/v1/customers/{id}", createdId)
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.email").isEqualTo("test@example.com");
    }
}
```
