# OpenTelemetry

## Purpose

Instrument Spring Boot services with distributed tracing, metrics, and log correlation using OpenTelemetry.

## When to Use

- Every service must export OpenTelemetry traces in production.
- Use when diagnosing cross-service latency issues, tracing request flows, or auditing security events.
- Use with Micrometer and Prometheus for the full observability stack.

## Best Practices

- Add `opentelemetry-spring-boot-starter` for auto-configuration.
- Configure `OTEL_SERVICE_NAME` as an environment variable matching the service name.
- Export traces to an OTLP collector (Grafana Tempo, Jaeger, or SigNoz).
- Set `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` for production sampling.
- Add custom span attributes for business-relevant context (orderId, customerId, paymentId).
- Use `@WithSpan` annotation on methods that represent important units of work.
- Propagate trace context via HTTP headers (W3C traceparent) and Kafka message headers.
- Use `MDC` for automatic log correlation: traceId and spanId are injected into logs.

## Anti-Patterns

- Adding spans on every method — instrument at service boundaries (controllers, message listeners, external calls).
- Sampling at 100% in production without volume-based sampling configuration.
- Not setting `OTEL_SERVICE_NAME` — traces are unidentifiable without it.
- Sending traces directly to a backend without a collector — collectors provide batching, retry, and multi-destination routing.
- Not configuring span exporters for non-HTTP boundaries (Kafka, gRPC, scheduled tasks).

## Examples

**application.yml:**
```yaml
otel:
  service:
    name: ${spring.application.name}
  exporter:
    otlp:
      endpoint: http://collector:4318
  traces:
    sampler: parentbased_traceidratio
    sampler.arg: 0.1
```

**Custom span:**
```java
@Service
public class OrderService {
    @WithSpan("processOrder")
    public OrderResult process(PlaceOrderCommand command) {
        Span.current().setAttribute("order.id", command.orderId());
        Span.current().setAttribute("order.total", command.total().doubleValue());
        // business logic
    }
}
```
