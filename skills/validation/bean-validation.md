# Bean Validation

## Purpose

Validate incoming request data consistently using Jakarta Bean Validation 3.1+ constraints, ensuring clear error messages and preventing invalid data from reaching the service layer.

## When to Use

- Every REST endpoint that accepts a request body or query parameters.
- Every command/request object in the application layer.
- Required by implementation-engineer for all controller input validation.
- Required by code-reviewer to verify validation coverage.

## Best Practices

### Request Record with Validation

```java
public record CreateOrderRequest(
    @NotNull UUID customerId,
    @NotEmpty List<@Valid OrderItemRequest> items,
    @NotBlank @Size(max = 3) String currency
) {}

public record OrderItemRequest(
    @NotBlank String sku,
    @Min(1) @Max(999) int quantity,
    @NotNull @Positive Money amount
) {}
```

### Custom Validator

```java
@Target(FIELD)
@Retention(RUNTIME)
@Constraint(validatedBy = ValidCurrencyValidator.class)
public @interface ValidCurrency {
    String message() default "Unsupported currency";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class ValidCurrencyValidator implements ConstraintValidator<ValidCurrency, String> {
    private static final Set<String> SUPPORTED = Set.of("USD", "EUR", "GBP");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && SUPPORTED.contains(value.toUpperCase());
    }
}

// Usage
public record PaymentRequest(
    @ValidCurrency String currency,
    @Positive Money amount
) {}
```

### Cross-Field Validation

```java
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = DateRangeValidator.class)
public @interface ValidDateRange {
    String message() default "startDate must be before endDate";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, DateRangeRequest> {
    @Override
    public boolean isValid(DateRangeRequest request, ConstraintValidatorContext context) {
        return request.startDate().isBefore(request.endDate());
    }
}

@ValidDateRange
public record DateRangeRequest(
    @NotNull Instant startDate,
    @NotNull Instant endDate
) {}
```

### Grouped Validation

```java
public interface Create {}
public interface Update {}

public record CustomerRequest(
    @Null(groups = Create.class) UUID id,
    @NotBlank(groups = Create.class) String name,
    @Null(groups = Create.class) Instant updatedAt
) {}

// Controller
@PostMapping
public CustomerResponse create(@Validated(Create.class) @RequestBody CustomerRequest request) { ... }

@PutMapping("/{id}")
public CustomerResponse update(@Validated(Update.class) @RequestBody CustomerRequest request) { ... }
```

### Controller Exception Handler

```java
@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        var problem = ProblemDetail.forStatus(BAD_REQUEST);
        problem.setTitle("Validation failed");
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new ValidationError(e.getField(), e.getDefaultMessage()))
            .toList());
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        var problem = ProblemDetail.forStatus(BAD_REQUEST);
        problem.setTitle("Constraint violation");
        problem.setProperty("errors", ex.getConstraintViolations().stream()
            .map(v -> new ValidationError(v.getPropertyPath().toString(), v.getMessage()))
            .toList());
        return problem;
    }

    private record ValidationError(String field, String message) {}
}
```

### Standard Constraints Reference

| Constraint | Type | Use Case |
|---|---|---|
| `@NotNull` | All | Required field |
| `@NotEmpty` | String, Collection | Not null and not empty |
| `@NotBlank` | String | Not null and has at least one non-whitespace char |
| `@Size(min, max)` | String, Collection | Length/size boundaries |
| `@Min` / `@Max` | Number | Numeric boundaries |
| `@Positive` / `@PositiveOrZero` | Number | Positive values |
| `@Negative` / `@NegativeOrZero` | Number | Negative values |
| `@Email` | String | Email format |
| `@Pattern(regex)` | String | Regex validation |
| `@Past` / `@Future` | Temporal | Date validations |
| `@PastOrPresent` / `@FutureOrPresent` | Temporal | Date with current |
| `@Digits(integer, fraction)` | Number | Decimal precision |

### Validation on Query Params and Path Variables

```java
@RestController
@Validated  // Needed for method-level validation
public class ProductController {
    @GetMapping("/api/v1/products")
    public Page<ProductResponse> list(
        @RequestParam @NotBlank String category,
        @RequestParam @Min(0) @Max(100) int size,
        @RequestParam @Pattern(regexp = "^(asc|desc)$") String sort
    ) { ... }
}
```

### Programmatic Validation

```java
@Service
public class OrderService {
    private final Validator validator;

    public OrderService(Validator validator) {
        this.validator = validator;
    }

    public void createOrder(CreateOrderRequest request) {
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
        // ...
    }
}
```

## Anti-Patterns

- **Validating in the controller with try-catch** — use `@Valid` and the global `@ControllerAdvice`. Never catch validation errors locally.
- **Validation in the service layer via if-statements** — use declarative constraints. If-logic hides validation intent.
- **Throwing generic IllegalArgumentException** — be specific: `ConstraintViolationException`, `ResourceNotFoundException`, etc.
- **@NotNull on primitive fields** — primitives default to 0/false. Use `@Min(1)` or wrapper types.
- **One-size-fits-all validation groups** — groups add complexity. Use separate request records for different operations when validation differs significantly.
- **Exposing internal error details** — never show SQL, stack traces, or constraint internals in error responses.

## Application Checklist

- `@Valid` on all `@RequestBody` parameters
- `@Validated` on controllers with validated query/path params
- Custom validators for business-specific rules (currency, date range, cross-field)
- Global `@RestControllerAdvice` handling `MethodArgumentNotValidException` and `ConstraintViolationException`
- Error response uses problem+json format
- Validation groups for create vs update where needed
- Sensible error messages (not "must not be null" — say "customerId is required")
- No validation logic in controller method bodies
