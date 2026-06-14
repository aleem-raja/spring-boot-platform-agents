# OpenAPI

## Purpose

Design, document, and validate REST APIs using OpenAPI 3.1 specification with Spring Boot, ensuring a single source of truth for API contracts, client generation, and documentation.

## When to Use

- Every REST API in every service must have an OpenAPI specification.
- Required for the generate-docs playbook.
- Required for API contract testing with Spring Cloud Contract or Pact.
- Used by code-reviewer to verify API design consistency.

## Best Practices

### SpringDoc Auto-Generation

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.0</version>
</dependency>
```

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method
    tagsSorter: alpha
    display-request-duration: true
  default-produces-media-type: application/json
  group-configs:
    - group: v1
      paths-to-match: /api/v1/**
    - group: v2
      paths-to-match: /api/v2/**
```

### Controller Annotations

```java
@RestController
@RequestMapping("/api/v1/customers")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Customers", description = "Customer management API")
public class CustomerController {

    @Operation(summary = "Get customer by ID", description = "Returns a single customer by their UUID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Customer found",
            content = @Content(schema = @Schema(implementation = CustomerResponse.class))),
        @ApiResponse(responseCode = "404", description = "Customer not found",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    @GetMapping("/{customerId}")
    public CustomerResponse getById(
            @PathVariable @Parameter(description = "Customer UUID", example = "123e4567-e89b-12d3-a456-426614174000")
            UUID customerId) {
        return service.findById(customerId);
    }

    @Operation(summary = "List customers", description = "Paginated list of customers")
    @GetMapping
    public Page<CustomerSummary> list(
            @PageableDefault(size = 20, sort = "createdAt", direction = DESC) Pageable pageable,
            @RequestParam(required = false) @Parameter(description = "Filter by email domain")
            String emailDomain) {
        return service.findAll(pageable, emailDomain);
    }
}
```

### Schema Annotations on Records

```java
@Schema(description = "Customer creation request")
public record CreateCustomerRequest(
    @Schema(description = "Customer email address", example = "user@example.com", requiredMode = REQUIRED)
    @NotBlank @Email String email,

    @Schema(description = "Customer full name", example = "John Doe", requiredMode = REQUIRED)
    @NotBlank @Size(min = 1, max = 200) String name,

    @Schema(description = "Customer phone number (optional)", example = "+1-555-1234")
    String phone
) {}

@Schema(description = "Customer response")
public record CustomerResponse(
    @Schema(description = "Customer UUID", example = "123e4567-e89b-12d3-a456-426614174000")
    UUID id,

    @Schema(description = "Customer email address", example = "user@example.com")
    String email,

    @Schema(description = "Customer full name", example = "John Doe")
    String name,

    @Schema(description = "ISO-8601 creation timestamp", example = "2024-01-15T10:30:00Z")
    Instant createdAt
) {}
```

### OpenAPI Configuration Bean

```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Customer Service API")
                .description("REST API for customer management")
                .version("1.0.0")
                .contact(new Contact().name("Platform Team").email("platform@example.com"))
                .license(new License().name("Proprietary")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Enter JWT bearer token")))
            .externalDocs(new ExternalDocumentation()
                .description("API Migration Guide")
                .url("https://docs.example.com/api-migration"));
    }
}
```

### Polymorphic Schemas (oneOf/anyOf)

```java
@Schema(oneOf = {CreditCardPayment.class, PayPalPayment.class, CryptoPayment.class})
public sealed interface Payment permits CreditCardPayment, PayPalPayment, CryptoPayment {
    @Schema(description = "Payment amount")
    Money amount();
}

@Schema(description = "Credit card payment")
public record CreditCardPayment(
    @Schema(description = "Last 4 digits", example = "4242") String lastFour,
    @Schema(description = "Card brand", example = "Visa") String brand,
    Money amount
) implements Payment {}
```

### Versioning in OpenAPI

```yaml
springdoc:
  group-configs:
    - group: v1
      paths-to-match: /api/v1/**
      display-name: "API v1 (stable)"
    - group: v2
      paths-to-match: /api/v2/**
      display-name: "API v2 (latest)"
```

This generates two Swagger UI tabs and two `/v3/api-docs` endpoints.

### Spec-First Workflow

For new APIs, design the OpenAPI spec first, then generate code:

1. Write `openapi.yml` with all endpoints, schemas, security schemes, and error responses.
2. Validate with `swagger-cli validate openapi.yml` or Redocly.
3. Generate server stub with `openapi-generator`.
4. Implement the generated interfaces.

```bash
npx @openapitools/openapi-generator-cli generate \
  -g spring \
  -i openapi.yml \
  -o generated \
  --library spring-boot \
  --additional-properties=useSpringBoot3=true,useJakartaEe=true,interfaceOnly=true
```

## Anti-Patterns

- Generating spec from code only — maintains a single source of truth but loses design-first benefits. Prefer spec-first for new APIs.
- Not documenting error responses — every endpoint must document 400, 401, 403, 404, 500 responses with problem+json schema.
- Using deprecated Swagger 2 annotations (`@Api`, `@ApiModel`) — use SpringDoc annotations (`@Operation`, `@Schema`).
- Not versioning the API — the spec must include `/api/v1/` prefix in paths. Use group-configs for multi-version docs.
- Exposing internal fields in API responses — use `@Schema(hidden = true)` or DTOs with only the fields you want to expose.
- Hardcoding server URLs in annotations — use `springdoc.server.url` property or `ServersOpenApiCustomizer`.
- Missing pagination documentation — document `page`, `size`, `sort` parameters and paginated response structure.

## Application Checklist

- SpringDoc dependency added with swagger-ui
- `@Operation` and `@ApiResponses` on all endpoints
- `@Schema` on all request/response records
- Reusable schemas documented (not inlined)
- Security scheme defined (bearerAuth)
- Error responses documented (problem+json)
- Group-configs for multiple API versions
- Pagination parameters documented
- Spec validated (no missing/duplicate paths)
- OpenAPI endpoint accessible at `/v3/api-docs`
