# Coding Standard

Reusable Java coding conventions for Spring Boot services.

## Language Version

- Target Java 25 language features. Use source/target version 25 in Maven/Gradle.
- Use --enable-preview only for finalized features in the current JDK. Do not use preview features in production.

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Class | UpperCamelCase, noun | OrderService, CustomerRepository |
| Interface | UpperCamelCase, adjective or -able/-ible | Persistable, Closeable |
| Method | lowerCamelCase, verb | calculateTotal(), findById() |
| Field | lowerCamelCase | totalAmount, customerId |
| Constant | UPPER_SNAKE_CASE | MAX_RETRY_COUNT |
| Package | all lowercase, no underscores | com.example.service.domain |
| Record | UpperCamelCase, noun (like class) | OrderLine, Address |
| Enum | UpperCamelCase, noun | OrderStatus, PaymentMethod |
| Enum constant | UPPER_SNAKE_CASE | PENDING, COMPLETED |

## File Organization

A Java file follows this order:

1. License header (if applicable)
2. Package declaration
3. Import statements (no wildcard imports; no unused imports)
4. Class/interface/record/enum declaration
5. Static fields
6. Instance fields
7. Static factory methods (of(), from())
8. Constructor(s)
9. Public methods
10. Private methods
11. equals(), hashCode(), toString() (if not using records)

## Language Feature Usage

**Prefer:**

- `record` for data carriers (DTOs, value objects, parameters)
- `sealed interface` / `sealed class` for restricted type hierarchies
- `sealed interface` permits clause for exhaustive pattern matching
- `switch` expressions with pattern matching over if-else chains
- `instanceof` pattern matching over traditional instanceof + cast
- `text blocks` for multi-line strings (SQL, JSON, HTML)
- `String.formatted()` over String.format()
- `List.of()`, `Set.of()`, `Map.of()` for immutable collections
- `Optional` for nullable return types (not for fields or parameters)
- virtual threads via `Executors.newVirtualThreadPerTaskExecutor()` for blocking I/O
- structured concurrency via `StructuredTaskScope` for parallel subtasks

**Avoid:**

- `var` in public API signatures (method parameters, return types)
- `null` returns — use `Optional` or empty collections
- `@Autowired` field injection — use constructor injection
- mutable collection fields — use `Collections.unmodifiable*` or `List.copyOf()`
- `synchronized` blocks — use `ReentrantLock` or structured concurrency
- `finalize()` — use Cleaner or AutoCloseable
- `java.util.Date` and `java.util.Calendar` — use `java.time.*`
- `StringBuffer` — use `StringBuilder`
- `Stack` — use `ArrayDeque`
- `Hashtable` and `Vector` — use `HashMap` and `ArrayList`

## Exception Handling

- Use domain-specific exceptions in the domain layer, not generic RuntimeException.
- Use `@ControllerAdvice` for centralized exception handling in REST controllers.
- Return RFC 9457 problem+json for all error responses.
- Never log and rethrow — either log at the boundary or let it propagate to the handler.
- Use `Objects.requireNonNull()` for constructor parameter validation.

## Null Safety

- Annotate all public method parameters and return types with JSpecify annotations:
  - `@NullMarked` on package-level `package-info.java`
  - `@Nullable` for nullable parameters/returns
  - No annotation means non-null (when `@NullMarked` is active)
- Enable `-Werror:null` in Maven/Gradle for compilation-time null checking.

## Testing Conventions

- Use `@ParameterizedTest` over repeated `@Test` for data variations.
- Use AssertJ fluent assertions over JUnit assertions.
- Use `@DisplayName` with descriptive sentences ("should return 404 when customer not found").
- Follow given-when-then structure with blank-line separation.
- Test names: `methodName_scenario_expectedBehavior` (e.g., `findById_whenNotFound_throwsException`).
