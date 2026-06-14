# OpenAPI

## Purpose

Design, document, and validate REST APIs using OpenAPI 3.1 specification with Spring Boot.

## When to Use

- Every REST API in every service must have an OpenAPI specification.
- Required for the generate-docs playbook.
- Required for API contract testing with Microcks or Spring Cloud Contract.

## Best Practices

- Use `springdoc-openapi-starter-webmvc-ui` for automatic OpenAPI generation from annotations.
- Use OpenAPI 3.1 (not 3.0) for JSON Schema compatibility.
- Annotate with `@Operation`, `@ApiResponse`, and `@Schema` for complete documentation.
- Define reusable schemas as Java records with `@Schema` annotations.
- Use `@SecurityRequirement(name = "bearerAuth")` on operations that require authentication.
- Keep generated spec in version control — `src/main/resources/openapi.yml` as the source of truth.
- Use `springdoc.swagger-ui.operationsSorter=method` for consistent ordering.
- Use `springdoc.default-produces-media-type=application/json` for REST APIs.

## Anti-Patterns

- Generating spec from code only — maintains a single source of truth but loses design-first benefits. Prefer spec-first for new APIs.
- Not documenting error responses — every endpoint must document 400, 401, 403, 404, 500 responses.
- Using deprecated annotations (`@Api` from Swagger 2) — use SpringDoc annotations.
- Not versioning the API — the spec must include `/api/v1/` prefix in paths.
- Exposing internal implementation details in the spec — use `@Schema(hidden = true)` for internal fields.

## Examples

**Controller:**
```java
@RestController
@RequestMapping("/api/v1/customers")
@SecurityRequirement(name = "bearerAuth")
public class CustomerController {
    @Operation(summary = "Get customer by ID")
    @ApiResponse(responseCode = "200", description = "Customer found")
    @ApiResponse(responseCode = "404", description = "Customer not found",
        content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping("/{id}")
    public CustomerResponse getById(@PathVariable @Parameter(description = "Customer UUID") UUID id) {
        return service.findById(id);
    }
}
```

**OpenAPI configuration:**
```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Customer Service API")
                .description("REST API for customer management")
                .version("1.0.0"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
    }
}
```

**application.yml:**
```yaml
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method
  default-produces-media-type: application/json
```
