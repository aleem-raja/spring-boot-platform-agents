# Resilience4j

## Purpose

Protect services from cascading failures, handle transient errors gracefully, and maintain availability when downstream dependencies degrade.

## When to Use

- Every HTTP/gRPC call to an external service or another internal service.
- Every database interaction that may experience transient failures.
- Required by performance-engineer and code-reviewer.
- Required by implementation-engineer for service-to-service communication.

## Best Practices

### Circuit Breaker

```java
@Bean
public Customizer<Resilience4JCircuitBreakerFactory> defaultCB() {
    return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
        .circuitBreakerConfig(CircuitBreakerConfig.custom()
            .slidingWindowType(COUNT_BASED)
            .slidingWindowSize(10)
            .minimumNumberOfCalls(5)
            .failureRateThreshold(50)
            .slowCallRateThreshold(50)
            .slowCallDurationThreshold(Duration.ofSeconds(2))
            .waitDurationInOpenState(Duration.ofSeconds(10))
            .permittedNumberOfCallsInHalfOpenState(3)
            .recordExceptions(IOException.class, TimeoutException.class, HttpServerErrorException.class)
            .ignoreExceptions(ValidationException.class) // 4xx should not open circuit
            .build())
        .timeLimiterConfig(TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofSeconds(2))
            .build())
        .build());
}
```

States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (probing) → CLOSED or OPEN.

### Retry

```java
@Retry(name = "inventory", fallbackMethod = "fallback")
public StockResponse checkStock(String sku) {
    return inventoryClient.checkStock(sku);
}

public StockResponse fallback(String sku, Exception ex) {
    log.warn("Inventory check failed for {}: {}", sku, ex.getMessage());
    return new StockResponse(sku, 0, false); // Assume unavailable
}
```

```yaml
resilience4j:
  retry:
    configs:
      default:
        maxAttempts: 3
        waitDuration: 500ms
        retryExceptions:
          - org.springframework.dao.DataAccessException
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        ignoreExceptions:
          - com.example.domain.ResourceNotFoundException
```

### Time Limiter

```java
@TimeLimiter(name = "payment")
public CompletableFuture<PaymentResponse> processPayment(PaymentRequest request) {
    return CompletableFuture.supplyAsync(() -> paymentClient.process(request));
}
```

### Bulkhead (Thread Pool Isolation)

```java
@Bulkhead(name = "orderProcessing", type = THREADPOOL)
public CompletableFuture<Order> processOrder(CreateOrderRequest request) {
    return CompletableFuture.supplyAsync(() -> orderService.create(request));
}
```

```yaml
resilience4j:
  bulkhead:
    configs:
      default:
        maxConcurrentCalls: 20
        maxWaitDuration: 500ms
  thread-pool-bulkhead:
    configs:
      default:
        maxThreadPoolSize: 4
        coreThreadPoolSize: 2
        queueCapacity: 20
```

### Rate Limiter

```java
@RateLimiter(name = "api")
@GetMapping("/api/v1/public/products")
public List<Product> listProducts() { ... }
```

```yaml
resilience4j:
  ratelimiter:
    configs:
      default:
        limitForPeriod: 100
        limitRefreshPeriod: 1s
        timeoutDuration: 0ms
```

### Metric Exposure

All Resilience4j decorators automatically expose Micrometer metrics:
- `resilience4j.circuitbreaker.state` — current state (0/1)
- `resilience4j.circuitbreaker.calls` — successful/failed/ignored calls
- `resilience4j.retry.calls` — successful/failed calls after retries
- `resilience4j.bulkhead.calls` — available/concurrent calls
- `resilience4j.ratelimiter.calls` — permitted/rejected calls

### Architecture Decision: How to Place Decorators

| Pattern | When |
|---|---|
| `@FeignClient` + `@CircuitBreaker` + `@Retry` + `@TimeLimiter` | Default for all HTTP clients |
| `@Retry` on repository methods | For transient DB failures (not constraint violations) |
| `@Bulkhead` on `@KafkaListener` methods | Prevent consumer threads from flooding downstream |
| `@RateLimiter` on public API endpoints | Throttle external clients by plan tier |
| `@CircuitBreaker` around external API calls | Protect service when third-party APIs degrade |

## Anti-Patterns

- **No fallback** — circuit breaker without a fallback means the calling service still fails. Always provide a degraded response.
- **Retry on idempotent writes** — retrying a non-idempotent POST creates duplicate resources. Use idempotency keys.
- **Retry forever** — exponential backoff with max attempts (3 typically). Infinite retries can cause thundering herd on recovery.
- **Same timeout for all calls** — payment processing may need 5s, cache lookup needs 100ms. Configure per remote call.
- **Catching and swallowing circuit breaker exceptions** — let them propagate to the fallback method or global handler.
- **Bulkhead on virtual thread services** — virtual threads do not need thread pool isolation. Use semaphore-based bulkhead instead.

## Application Checklist

- Circuit breaker on every HTTP/gRPC client call
- Retry with exponential backoff on transient failures
- Time limiter with service-appropriate timeouts
- Bulkhead or semaphore isolation on consumer listeners
- Fallback methods for all circuit breaker calls
- Resilience4j metrics exposed via Micrometer
- Alerts configured for circuit breaker OPEN state
- Idempotency keys for non-idempotent retried operations
- `recordExceptions`/`ignoreExceptions` properly configured per call
