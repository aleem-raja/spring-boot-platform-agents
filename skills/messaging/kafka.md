# Apache Kafka

## Purpose

Build event-driven communication between services using Kafka for reliable, durable, and scalable async messaging.

## When to Use

- Inter-service communication that does not require a synchronous response.
- Event-driven workflows (sagas, CQRS, event sourcing).
- Streaming data pipelines and log aggregation.
- Decoupling producers from consumers across service boundaries.

## Best Practices

### Producer Configuration

```java
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, OrderEvent> kafka;

    public OrderEventProducer(KafkaTemplate<String, OrderEvent> kafka) {
        this.kafka = kafka;
    }

    public void orderPlaced(OrderEvent event) {
        kafka.send("order.events", event.orderId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to send order event: {}", event.orderId(), ex);
                }
            });
    }
}
```

### Consumer Configuration

```java
@Service
public class InventoryConsumer {
    @KafkaListener(topics = "order.events", groupId = "inventory-service")
    public void handleOrderPlaced(OrderEvent event, Acknowledgment ack) {
        try {
            inventoryService.reserveStock(event);
            ack.acknowledge();
        } catch (InsufficientStockException e) {
            // Publish compensation event
            eventProducer.stockReservationFailed(event);
            ack.acknowledge();
        }
    }
}
```

### Topic and Partition Strategy

| Concern | Recommendation |
|---|---|
| Partition count | Start with 3-6 partitions per topic. Scale up when consumer lag exceeds threshold. |
| Replication factor | 3 in production (minISR = 2). 1 in dev/test. |
| Key strategy | Use business ID (orderId, customerId) for ordering guarantees per entity. |
| Retention | 7 days default. Increase for event sourcing / audit. Compacted topics for keyed state. |
| Message size | Max 1 MB default. For large payloads, store in S3 and send reference. |

### Idempotent Processing

```java
@Service
public class IdempotentConsumer {
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();

    @KafkaListener(topics = "payment.events")
    public void handlePayment(PaymentEvent event) {
        if (!processedIds.add(event.eventId())) {
            log.info("Duplicate event skipped: {}", event.eventId());
            return;
        }
        // Process event
    }
}
```

Better approach: store processed event IDs in the database with a unique constraint.

### Error Handling

```java
@Configuration
public class KafkaErrorConfig {
    @Bean
    public DefaultErrorHandler errorHandler() {
        var handler = new DefaultErrorHandler(
            new FixedBackOff(1000L, 3L) // 1s delay, 3 retries
        );
        handler.setRetryListeners((record, ex, attempt) ->
            log.warn("Retry attempt {} for record {}", attempt, record.key()));
        return handler;
    }

    @Bean
    public DeadLetterPublishingRecoverer recoverer(KafkaTemplate<String, Object> template) {
        return new DeadLetterPublishingRecoverer(template,
            (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));
    }
}
```

### Schema Registry with Avro

```java
// Producer
@Bean
public KafkaTemplate<String, OrderEvent> kafkaTemplate(ProducerFactory<String, OrderEvent> pf) {
    return new KafkaTemplate<>(pf);
}

// Consumer
@Bean
public ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory(
        ConsumerFactory<String, OrderEvent> cf) {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, OrderEvent>();
    factory.setConsumerFactory(cf);
    return factory;
}
```

### application.yml

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        enable.idempotence: true
        acks: all
        compression.type: snappy
    consumer:
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*"
        isolation.level: read_committed
        auto.offset.reset: earliest
        enable.auto.commit: false
```

### Transactional Outbox Pattern

```java
// Domain event recorded in same DB transaction
@Service
public class OrderService {
    @Transactional
    public void placeOrder(CreateOrderCommand cmd) {
        var order = new Order(cmd);
        orderRepository.save(order);
        outboxRepository.save(new OutboxEvent(
            EventType.ORDER_PLACED, objectMapper.writeValueAsString(order)));
    }
}

// Polling publisher relays outbox to Kafka
@Scheduled(fixedDelay = 1000)
@Transactional
public void publishOutbox() {
    var events = outboxRepository.findAllByPublishedFalseOrderByCreatedAt();
    for (var event : events) {
        kafkaTemplate.send(event.topic(), event.payload()).get();
        event.markPublished();
    }
}
```

## Anti-Patterns

- Direct database access in Kafka consumers — consumers should call the service layer, not repositories.
- Auto-commit enabled — risk of losing messages on crash. Always use manual ack.
- Synchronous sends in request threads — blocks the HTTP thread. Use async send or delegate to a `@Async` method.
- Thousands of partitions — each partition is a file in the broker. Too many partitions increase recovery time.
- Using Kafka for request-reply — Kafka is for fire-and-forget events. Use REST/gRPC for request-reply.

## Application Checklist

- Topics created with `NewTopic` bean (auto-create disabled in production)
- `acks=all` and `enable.idempotence=true` on producers
- Manual `acknowledge()` with `enable.auto.commit=false`
- Dead letter topic configured with retry policy
- Idempotent consumers (duplicate detection by event ID)
- Transactional outbox pattern for critical events
- Consumer group ID unique per service instance
- `spring.json.trusted.packages` configured
- Consumer lag monitored (KafkaConsumerMetrics via Micrometer)
