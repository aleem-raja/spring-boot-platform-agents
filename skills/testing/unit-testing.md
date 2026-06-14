# Unit Testing

## Purpose

Verify domain logic and service behavior in isolation with fast, deterministic tests that do not require Spring context or external infrastructure.

## When to Use

- Every domain model, use case, and business rule.
- Required by test-engineer for all development.
- Required by code-reviewer to verify test quality and coverage.

## Best Practices

### Structure: Given-When-Then

```java
class OrderServiceTest {
    private final OrderRepository repository = mock(OrderRepository.class);
    private final OrderService service = new OrderService(repository);

    @Test
    void shouldCreateOrderWhenStockAvailable() {
        // Given
        var request = new CreateOrderRequest(UUID.randomUUID(), List.of(
            new OrderItemRequest("SKU-001", 2)
        ));
        var savedOrder = new Order(request.customerId());
        when(repository.save(any(Order.class))).thenReturn(savedOrder);

        // When
        var result = service.create(request);

        // Then
        assertThat(result.id()).isNotNull();
        assertThat(result.status()).isEqualTo(OrderStatus.PENDING);
        verify(repository).save(any(Order.class));
    }

    @Test
    void shouldRejectOrderWhenNoItems() {
        var request = new CreateOrderRequest(UUID.randomUUID(), List.of());
        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(ValidationException.class)
            .hasMessage("Order must have at least one item");
        verifyNoInteractions(repository);
    }
}
```

### Test Naming

- `should<ExpectedBehavior>When<Condition>` — `shouldRejectOrderWhenNoItems()`
- `should<Action>` — `shouldCreateOrder()`
- `shouldThrow<Exception>When<Condition>` — `shouldThrowResourceNotFoundExceptionWhenProductNotFound()`

### Mocking Guidelines

```java
// DO: mock external boundaries only (repositories, clients, event publishers)
var repository = mock(OrderRepository.class);

// DON'T: mock domain objects or value objects
// var order = mock(Order.class); // BAD — Order is a domain object

// DO: use real domain objects in tests
var order = new Order(customerId, items);
order.assignTo(warehouseId);
assertThat(order.status()).isEqualTo(OrderStatus.ASSIGNED);

// DO: verify interactions on mocked boundaries
verify(repository).save(order);

// DON'T: verify interactions on domain objects
// verify(order).assignTo(warehouseId); // BAD — this is a state change, verify state, not interaction
```

### Test Fixtures with ObjectMother

```java
public class Orders {
    public static Order createOrder() {
        return new Order(UUID.randomUUID(), List.of(
            new OrderItem("SKU-001", 2, new Money("USD", 100)),
            new OrderItem("SKU-002", 1, new Money("USD", 50))
        ));
    }

    public static Order createEmptyOrder() {
        return new Order(UUID.randomUUID(), List.of());
    }
}

// Usage
@Test
void shouldCalculateTotal() {
    var order = Orders.createOrder();
    assertThat(order.total()).isEqualTo(new Money("USD", 250));
}
```

### Parametrized Tests

```java
@ParameterizedTest
@CsvSource({
    "PENDING,    true",
    "CONFIRMED,  false",
    "SHIPPED,    false",
    "CANCELLED,  false"
})
void shouldAllowCancellationOnlyWhenPending(OrderStatus status, boolean expected) {
    var order = new Order(UUID.randomUUID(), items);
    order.assignTo(warehouseId);
    // ...set status via reflection or state machine
    assertThat(order.canCancel()).isEqualTo(expected);
}

@ParameterizedTest
@MethodSource("invalidRequestProvider")
void shouldRejectInvalidOrderRequests(CreateOrderRequest request, String expectedError) {
    var violations = validator.validate(request);
    assertThat(violations).anyMatch(v -> v.getMessage().equals(expectedError));
}
```

### Nesting for Organization

```java
@Nested
class CreateOrder {
    @Test
    void shouldCreateOrderWithValidRequest() { ... }

    @Test
    void shouldRejectWhenCustomerIdMissing() { ... }
}

@Nested
class CancelOrder {
    @Test
    void shouldCancelPendingOrder() { ... }

    @Test
    void shouldThrowWhenOrderAlreadyShipped() { ... }
}
```

### AssertJ Best Practices

```java
// Prefer AssertJ over JUnit assertions
assertThat(actual).isEqualTo(expected);
assertThatThrownBy(...).isInstanceOf(...);
assertThat(list).hasSize(3).containsExactly(a, b, c);
assertThat(optional).contains(expected);
assertThat(stream).map(Order::status).containsOnly(OrderStatus.PENDING);
```

### Testing Domain Logic (No Mocking)

```java
@Test
void orderShouldTransitionFromPendingToConfirmed() {
    var order = new Order(customerId, items);
    order.confirm();
    assertThat(order.status()).isEqualTo(OrderStatus.CONFIRMED);
}

@Test
void orderShouldThrowWhenTransitionFromShippedToConfirmed() {
    var order = new Order(customerId, items);
    order.confirm();
    order.ship();
    assertThatThrownBy(order::confirm)
        .isInstanceOf(IllegalStateException.class);
}
```

## Anti-Patterns

- **@SpringBootTest for unit tests** — unit tests = no Spring context. Use `@SpringBootTest` only for integration tests.
- **Mocking everything** — test domain logic with real objects. Mock only external boundaries.
- **Testing implementation details** — test behavior, not method calls. Refactoring should not break tests.
- **Slow unit tests** — unit tests should complete in milliseconds. If not, it is an integration test.
- **Shared mutable state between tests** — use `@BeforeEach` to recreate state. Never use `static` test data.
- **Over-specifying with verify()** — verify only the critical interactions, not every method call.
- **Testing private methods** — test through public API. If private method is too complex, extract it to a separate class.

## Application Checklist

- Unit tests cover all domain objects (entities, value objects, aggregates)
- Unit tests cover all service/use-case classes (business logic, orchestration)
- Mock external boundaries only (repositories, HTTP clients, event publishers)
- Parametrized tests for edge cases and boundary values
- AssertJ used over JUnit assertions
- Test class per production class
- Tests complete in < 100ms each
- No @SpringBootTest in unit tests
