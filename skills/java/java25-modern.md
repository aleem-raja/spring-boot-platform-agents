# Java 25 Modern Practices

## Purpose

Write idiomatic, production-grade Java using language features available in Java 25 LTS.

## When to Use

- Every Java class written in the platform.
- Required by implementation-engineer and code-reviewer.
- Required by agents in all playbooks that generate or review code.

## Best Practices

### Records for Data Carriers

```java
// Replaces POJOs with equals, hashCode, toString, constructor
// Immutable by default — thread-safe, predictable
public record CustomerResponse(
    UUID id,
    String name,
    String email,
    Instant createdAt
) {}

// Compact constructor for validation
public record CreateCustomerRequest(
    String name,
    String email
) {
    public CreateCustomerRequest {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        if (email == null || !email.contains("@")) throw new IllegalArgumentException("invalid email");
    }
}

// Local records for intermediate processing
public List<OrderSummary> summarize(List<Order> orders) {
    record Summary(UUID id, Money total) {}
    return orders.stream()
        .map(order -> new Summary(order.id(), order.calculateTotal()))
        .map(s -> new OrderSummary(s.id(), s.total()))
        .toList();
}
```

### Sealed Interfaces for Fixed Hierarchies

```java
public sealed interface Payment permits CreditCard, PayPal, CryptoTransfer {
    Money amount();
    Currency currency();
}

public record CreditCard(String lastFour, Money amount) implements Payment {}
public record PayPal(String email, Money amount) implements Payment {}
public record CryptoTransfer(String walletAddress, Money amount) implements Payment {}

// Compiler ensures all subtypes are known — no default needed in switch
public String processPayment(Payment payment) {
    return switch (payment) {
        case CreditCard c -> processCard(c);
        case PayPal p -> processPayPal(p);
        case CryptoTransfer c -> processCrypto(c);
    };
}
```

### Pattern Matching for instanceof

```java
// OLD
if (event instanceof OrderPlaced) {
    OrderPlaced e = (OrderPlaced) event;
    processOrder(e.orderId());
}

// NEW — no cast needed
if (event instanceof OrderPlaced e) {
    processOrder(e.orderId());
}

// Guarded patterns
if (event instanceof OrderPlaced e && e.isExpedited()) {
    expediteOrder(e.orderId());
}
```

### Switch Expressions and Pattern Matching

```java
// OLD — procedural, fall-through, mutable variable
OrderStatus status;
switch (event.type()) {
    case "PLACED": status = OrderStatus.PENDING; break;
    case "PAID": status = OrderStatus.CONFIRMED; break;
    default: status = OrderStatus.UNKNOWN;
}

// NEW — expression, exhaustive, no fall-through
var status = switch (event.type()) {
    case "PLACED" -> OrderStatus.PENDING;
    case "PAID" -> OrderStatus.CONFIRMED;
    case "SHIPPED" -> OrderStatus.SHIPPED;
    case "CANCELLED" -> OrderStatus.CANCELLED;
    default -> throw new IllegalArgumentException("Unknown event: " + event.type());
};

// Pattern matching in switch with sealed types
return switch (payment) {
    case CreditCard c -> authorizeCard(c);
    case PayPal p when p.amount().compareTo(new Money("USD", 10_000)) > 0 -> verifyAndAuthorize(p);
    case PayPal p -> authorizePayPal(p);
    case CryptoTransfer c -> authorizeCrypto(c);
};
```

### Virtual Threads (Project Loom)

```java
// Enable in application.yml:
// spring.threads.virtual.enabled: true

// Virtual threads are lightweight — 1M+ threads per JVM
// Never pool virtual threads — create new ones per task

// @Async methods use virtual threads automatically
@Async
public CompletableFuture<Order> processAsync(UUID orderId) {
    return CompletableFuture.completedFuture(process(orderId));
}

// Blocking operations are fine (no need for reactive for I/O)
public Order getById(UUID id) {
    return orderRepository.findById(id)  // JDBC call — blocks virtual thread, not carrier thread
        .orElseThrow(() -> new ResourceNotFoundException("Order", id));
}

// WARNING: Do not combine virtual threads with:
// - synchronized blocks (pinning) — use ReentrantLock
// - Thread pools bounded by parallelism (ForkJoinPool.common())
// - ThreadLocal heavily mutated — use ScopedValue (preview/incubator)
```

### Text Blocks

```java
// For SQL, JSON, HTML, and multi-line strings
var sql = """
    SELECT o.id, o.status, o.created_at
    FROM orders o
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC
    LIMIT ?
    """;

var json = """
    {
        "orderId": "%s",
        "status": "%s",
        "items": %s
    }
    """.formatted(orderId, status, itemsJson);
```

### Stream API Improvements

```java
// Stream.toList() — immutable list (Java 16+)
var activeProducts = products.stream()
    .filter(Product::isActive)
    .toList(); // Immutable, no need for .collect(Collectors.toList())

// Stream.mapMulti — flatMap alternative with better performance
var items = orders.stream()
    .mapMulti((Order order, Consumer<OrderItem> consumer) -> {
        for (var item : order.items()) consumer.accept(item);
    })
    .toList();
```

### Null Safety

```java
// Prefer Optional for return types that may be empty
public Optional<Order> findById(UUID id) { ... }

// Never return null from collections — return empty list
public List<Order> findByCustomerId(UUID customerId) {
    return repository.findByCustomerId(customerId); // JPA returns empty list, not null
}

// Use Objects.requireNonNull for constructor args in non-record classes
public class OrderService {
    public OrderService(OrderRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
    }
}
```

### Constructor Injection

```java
// Always use constructor injection (not @Autowired on fields)
@Service
public class OrderService {
    private final OrderRepository repository;
    private final EventPublisher publisher;

    public OrderService(OrderRepository repository, EventPublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }
}

// With Lombok (only when records don't fit)
// @RequiredArgsConstructor generates the constructor above
```

## Anti-Patterns

- **Field injection** — prevents `final` fields, breaks testing, hides dependencies.
- **Lombok @Data with @Entity** — breaks JPA identity contract. Use @Getter @Setter.
- **Synchronized blocks with virtual threads** — pins carrier threads. Use ReentrantLock.
- **Null returns from collections** — return `List.of()` or `Collections.emptyList()`.
- **Raw types** — always parameterize generics: `List<String>` not `List`.
- **Mutable DTOs** — use records for data transfer. Immutable by default.
- **Legacy Date/Calendar** — use `java.time` (Instant, LocalDate, ZonedDateTime, Duration).

## Application Checklist

- All DTOs and value objects use records
- Sealed interfaces used for type hierarchies with known subtypes
- Pattern matching for instanceof used everywhere
- Switch expressions (not switch statements) in all new code
- Virtual threads enabled via property or programmatic config
- Text blocks for SQL, JSON, and template strings
- Stream.toList() used instead of .collect(Collectors.toList())
- No field injection — only constructor injection
- No legacy Date/Calendar — only java.time
- No raw generic types
- No null returned from collection-returning methods
