# API Versioning

## Purpose

Evolve REST APIs safely over time without breaking existing clients, using a clear versioning strategy, deprecation policy, and migration path.

## When to Use

- Every REST API exposed to external clients, partners, or mobile apps.
- Required by the architect agent during create-service and add-feature playbooks.
- Required by code-reviewer to verify breaking changes are versioned correctly.

## Versioning Strategies

### 1. URL Prefix Versioning (Default)

Embed the version in the URL path. This is the simplest and most visible approach.

```
/api/v1/customers
/api/v2/customers
/api/v1/orders
```

**Pros:** Explicit and easy to route; clients see the version immediately; simple to implement in Spring Boot with `@RequestMapping("/api/v1/...")`.

**Cons:** URL pollution; clients may hardcode versions and never upgrade.

**Spring Boot implementation:**
```java
@RestController
@RequestMapping("/api/v1/customers")
public class CustomerControllerV1 {
    @GetMapping("/{id}")
    public CustomerResponseV1 getById(@PathVariable UUID id) { ... }
}

@RestController
@RequestMapping("/api/v2/customers")
public class CustomerControllerV2 {
    @GetMapping("/{id}")
    public CustomerResponseV2 getById(@PathVariable UUID id) { ... }
}
```

### 2. Accept Header Versioning (Content Negotiation)

Clients specify the version in the `Accept` header using a vendor media type.

```
Accept: application/vnd.example.v1+json
Accept: application/vnd.example.v2+json
```

**Pros:** Clean URLs; versioning is decoupled from the resource path; aligns with REST principles.

**Cons:** Less visible in documentation; harder to test manually in a browser; requires custom `WebMvcConfigurer` or filter.

**Spring Boot implementation:**
```java
@Configuration
public class ApiVersionConfig implements WebMvcConfigurer {
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer.favorParameter(false)
            .favorPathExtension(false)
            .ignoreAcceptHeader(false);
    }
}

@GetMapping(value = "/customers/{id}", produces = "application/vnd.example.v2+json")
public CustomerResponseV2 getById(@PathVariable UUID id) { ... }
```

### 3. Query Parameter Versioning

Clients specify the version as a query parameter.

```
/api/customers?version=1
/api/customers?version=2
```

**Pros:** Easy to test; no header/URL structure changes.

**Cons:** Pollutes query space; caching issues (same URL, different content); not RESTful.

**Not recommended for production APIs.** Use only for internal or transitional APIs.

## Versioning Policy

### When to Bump Major Version

Bump the major version (v1 → v2) when the change is **breaking**. A change is breaking if it requires clients to modify their code:

| Change | Breaking? |
|---|---|
| Removing an endpoint | Yes |
| Renaming a field in the response | Yes |
| Changing a field type (string → number) | Yes |
| Making a previously optional field required | Yes |
| Changing the auth scheme | Yes |
| Changing error response format | Yes |
| **Adding a new endpoint** | **No** |
| **Adding an optional field to response** | **No** |
| **Adding an optional request parameter** | **No** |
| **Changing response header names** | **No** |
| **Extending an enum** | **No** |

### Additive Changes Are Safe

Non-breaking changes should be made within the existing version:

- Add new endpoints without modifying existing ones.
- Add optional fields to responses — existing clients ignore unknown fields (Jackson default).
- Add optional request parameters or headers.
- Relax input validation (never tighten it).
- Extend enums with new values (clients should handle unknown values gracefully).

### Deprecation Policy

1. **Announce** — Mark the old endpoint as deprecated in the response header and OpenAPI spec:
   ```
   Sunset: Sat, 31 Dec 2026 23:59:59 GMT
   Deprecation: true
   ```

2. **Communicate** — Document the deprecation in the API changelog and migration guide. Include the target version and migration path in the response body if possible:
   ```json
   {
       "error": "This endpoint is deprecated. Use /api/v2/customers/{id} instead.",
       "migrate_to": "/api/v2/customers/{id}",
       "sunset_date": "2026-12-31"
   }
   ```

3. **Support** — Maintain the deprecated version for at least:
   - 6 months for internal/partner APIs
   - 12 months for public APIs
   - 18+ months for mobile-facing APIs (app store update lag)

4. **Remove** — After the sunset date passes with minimal traffic, remove the endpoint. Return 410 Gone with a clear migration link.

### API Evolution Principles

1. **Always be additive** — Never remove or change a behavior that existing clients rely on without a version bump.
2. **Never break a client you cannot reach** — If you cannot notify every client, maintain backward compatibility.
3. **Version at the service boundary** — Internal service-to-service APIs can use header versioning for simplicity; external APIs must use URL prefix.
4. **One version per deployment** — Run both v1 and v2 controllers in the same deployment during the migration window.
5. **Test both versions** — Integration tests must cover all active API versions.

## Anti-Patterns

- No versioning at all — every change is potentially breaking; clients cannot safely upgrade.
- Versioning the entire API as a monolith (`/api/v1/`) when individual resources evolve at different rates — use per-resource versioning or keep the whole service at one version.
- Using `x-api-version` custom headers without OpenAPI documentation — undocumented versioning is invisible to tooling.
- Removing a version without verifying zero traffic — always check traffic metrics before removing.
- Multiple active versions with no deprecation timeline — versions accumulate and maintenance cost grows linearly.

## Examples

### Version Controller with Deprecation Headers

```java
@RestController
@RequestMapping("/api/v1/customers")
public class CustomerControllerV1 {
    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponseV1> getById(@PathVariable UUID id) {
        return ResponseEntity.ok()
            .header("Deprecation", "true")
            .header("Sunset", "Sat, 31 Dec 2026 23:59:59 GMT")
            .header("Link", "</api/v2/customers/" + id + ">; rel=\"successor-version\"")
            .body(service.findV1(id));
    }
}
```

### Version-Aware Error Response

```java
@ControllerAdvice
public class VersionedErrorHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        var problem = ProblemDetail.forStatus(404);
        problem.setTitle("Resource not found");
        problem.setDetail(ex.getMessage());
        problem.setProperty("api_version", extractVersion(request));
        problem.setProperty("supported_versions", List.of("v1", "v2"));
        return problem;
    }

    private String extractVersion(HttpServletRequest request) {
        var path = request.getRequestURI();
        var matcher = Pattern.compile("/api/(v\\d+)/").matcher(path);
        return matcher.find() ? matcher.group(1) : "unknown";
    }
}
```

### OpenAPI with Versioned Groups

```yaml
springdoc:
  group-configs:
    - group: v1
      paths-to-match: /api/v1/**
    - group: v2
      paths-to-match: /api/v2/**
```
