# Spring Cache

## Purpose

Improve response times and reduce database load by caching frequently accessed, infrequently changing data using Spring's cache abstraction.

## When to Use

- Read-heavy endpoints with low update frequency (reference data, configuration, user profiles).
- Expensive computations or external API calls with repeatable results.
- Required by performance-engineer for latency optimization.

## Best Practices

### Enable Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {}
```

### Declarative Caching

```java
@Service
public class ProductService {
    private final ProductRepository repository;

    // Cache single result
    @Cacheable(value = "products", key = "#id")
    public Product getById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    // Cache list results with conditional caching
    @Cacheable(value = "products", key = "'all-active'", unless = "#result.isEmpty()")
    public List<Product> getActiveProducts() {
        return repository.findByActiveTrue();
    }

    // Evict on mutation
    @CacheEvict(value = "products", key = "#result.id()")
    public Product create(CreateProductRequest request) {
        return repository.save(Product.from(request));
    }

    // Evict on update
    @CachePut(value = "products", key = "#id")
    public Product update(UUID id, UpdateProductRequest request) {
        var product = getById(id);
        product.update(request);
        return repository.save(product);
    }

    // Bulk evict
    @CacheEvict(value = "products", allEntries = true)
    @Scheduled(fixedRate = 300_000) // 5 minutes
    public void refreshProductCache() {}
}
```

### Cache Manager Configuration

```java
@Bean
public CacheManager cacheManager(RedisConnectionFactory factory) {
    var config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(10))
        .computePrefixWith(cacheName -> "cache:" + cacheName + ":")
        .disableCachingNullValues()
        .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
        .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

    return RedisCacheManager.builder(factory)
        .cacheDefaults(config)
        .withCacheConfiguration("products",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("reference-data",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(1)))
        .build();
}
```

### Cache Naming Convention

- `entities` — domain aggregates (products, orders, customers)
- `reference-data` — slowly changing reference/codelist data (countries, currencies, tax rates)
- `computation` — expensive calculation results
- `sessions` — user session data
- `api-responses` — external API call responses (with short TTL)

### TTL Strategy

| Data Type | TTL | Eviction Strategy |
|---|---|---|
| Reference data (countries, currencies) | 1-24 hours | Time-based |
| Product catalog | 5-15 minutes | Time-based + write-through |
| User profiles | 30-60 minutes | Time-based |
| Session data | 15-30 minutes | Time-based |
| External API responses | 30-120 seconds | Time-based |
| Computed values | Varies | Write-through |
| Rate limit counters | N/A (use Redis directly) | Sliding window |

### Cache Aside Pattern

```java
// Application does: Check cache → hit? return : query DB → populate cache → return
// @Cacheable does this automatically

// For manual control:
public Product getById(UUID id) {
    var cached = cacheManager.getCache("products").get(id, Product.class);
    if (cached != null) return cached;

    var product = repository.findById(id).orElseThrow();
    cacheManager.getCache("products").put(id, product);
    return product;
}
```

### Multi-Layer Caching

```java
// L1: Caffeine (local heap, fast, no network)
// L2: Redis (distributed, shared across pods)
@Primary
@Bean
public CacheManager multiTierCacheManager() {
    var caffeine = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(1, TimeUnit.MINUTES)
        .build();

    var caffeineCacheManager = new CaffeineCacheManager();
    caffeineCacheManager.setCaffeine(caffeine);
    return new JCacheManager(caffeineCacheManager);
}
```

## Anti-Patterns

- **@Cacheable on repository methods** — caches at the wrong level. Cache at the service layer to include business logic.
- **Caching mutable data without eviction** — stale data served after updates. Always evict on mutation.
- **Caching large collections** — eviction of one item requires clearing the entire collection cache.
- **Infinite TTL** — always set an expiration. No data is static forever.
- **Null caching** — `disableCachingNullValues()` prevents caching failed lookups as valid results.
- **Distributed caching without serialization plan** — Jackson serialization default changes can break deserialization across deployments.
- **@Cacheable on methods with complex arguments** — key generation must be explicit via `key` or `keyGenerator`.

## Application Checklist

- `@EnableCaching` on a `@Configuration` class
- Redis (or Caffeine for single-node) dependency added
- `@Cacheable` on read-heavy service methods
- `@CacheEvict` on all mutation methods (create, update, delete)
- `@CachePut` on endpoints that return the updated entity
- TTL configured per cache region (not one-size-fits-all)
- Cache hit/miss ratio monitored via Micrometer (`cache.*` metrics)
- Cache keys explicitly defined (not relying on default key generation)
- Null values not cached
- Cache prefix configured (avoids key collisions with other services)
