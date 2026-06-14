# Micrometer / Prometheus

## Purpose

Expose application metrics via Micrometer and scrape them into Prometheus for alerting and Grafana dashboards.

## When to Use

- Every service must expose `/actuator/prometheus` for Prometheus scraping.
- Required by sre-engineer for SLO monitoring and alerting rules.
- Required by performance-engineer for load testing analysis.

## Best Practices

### Custom Metrics

```java
@Configuration
public class OrderMetrics {
    private final Counter orderCreated;
    private final Timer orderProcessingTime;
    private final DistributionSummary orderValue;

    public OrderMetrics(MeterRegistry registry) {
        this.orderCreated = Counter.builder("orders.created.total")
            .description("Total number of orders placed")
            .tag("status", "success")
            .register(registry);

        this.orderProcessingTime = Timer.builder("orders.processing.duration")
            .description("Time to process an order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .sla(Duration.ofMillis(100), Duration.ofMillis(500))
            .register(registry);

        this.orderValue = DistributionSummary.builder("orders.value.amount")
            .description("Distribution of order values")
            .baseUnit("EUR")
            .publishPercentiles(0.5, 0.95, 0.99)
            .minimumExpectedValue(1.0)
            .maximumExpectedValue(10_000.0)
            .register(registry);
    }

    public void recordOrderCreated(String currency) {
        orderCreated.increment();
    }

    public void recordProcessingTime(long millis) {
        orderProcessingTime.record(Duration.ofMillis(millis));
    }

    public void recordOrderValue(double amount) {
        orderValue.record(amount);
    }
}
```

### @Timed Annotation

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    @GetMapping("/{id}")
    @Timed(value = "orders.get.by.id", percentiles = {0.5, 0.95, 0.99})
    public OrderResponse getById(@PathVariable UUID id) {
        // ...
    }
}
```

### Meter Binders (Auto-configured)

| Binder | Metrics | Purpose |
|---|---|---|
| JvmGcMetrics | jvm.gc.* | GC pause time, counts |
| JvmMemoryMetrics | jvm.memory.* | Heap, non-heap, off-heap |
| JvmThreadMetrics | jvm.threads.* | Thread states, peak thread count |
| ProcessorMetrics | system.cpu.*, process.cpu.* | CPU utilization |
| FileDescriptorMetrics | process.files.* | Open file descriptors |
| LogbackMetrics | logback.events.* | Log event counts per level |
| KafkaMetrics | kafka.* | Consumer lag, producer rates |
| HikariPoolMetrics | hikaricp.* | Connection pool usage, wait time |
| Jetty/ TomcatMetrics | tomcat.*, jetty.* | Active threads, request count, error count |
| CacheMetrics | cache.* | Cache hit/miss ratios |

### Prometheus Recording Rules

```yaml
groups:
  - name: service_slos
    rules:
      - record: service:request_latency_seconds:p95
        expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

      - record: service:error_ratio:5m
        expr: sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m]))
```

### Prometheus Alerting Rules

```yaml
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: service:error_ratio:5m > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 1% for 5 minutes"

      - alert: HighP95Latency
        expr: service:request_latency_seconds:p95 > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency exceeds 2 seconds"
```

### Grafana Dashboard Variables

Use labels consistently across services so one dashboard works for all:
- `application` — service name (from `spring.application.name`)
- `instance` — pod hostname
- `status` — HTTP status code range (2xx, 4xx, 5xx)

### Spring Boot Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    tags:
      application: ${spring.application.name}
    export:
      prometheus:
        enabled: true
    distribution:
      percentiles-histogram:
        http.server.requests: true
      slas:
        http.server.requests: 10ms, 50ms, 100ms, 200ms, 500ms, 1s, 2s
```

## Anti-Patterns

- Using `@Timed` on every method — clutters metrics; annotate only public API endpoints and key internal operations.
- Tag cardinality explosion — never put user ID, request ID, or random values as tags.
- Not setting percentiles — defaults to mean/median only, misses tail latency.
- Ignoring `hikaricp.connections.timeout` — first sign of connection pool exhaustion.
- Alerting on raw metrics without rate() — counter resets on pod restart produce false spikes.

## Application Checklist

- `management.endpoints.web.exposure.include` includes `prometheus`
- Custom metrics registered in `@Configuration` via `MeterRegistry`
- Key operations timed with `@Timed` or `Timer`
- Critical business events counted with `Counter`
- HTTP request metrics include percentiles via `percentiles-histogram`
- Prometheus recording rules defined for latency and error ratio
- Prometheus alerting rules for SLO violations
- Grafana dashboard created with `application` and `status` template variables
