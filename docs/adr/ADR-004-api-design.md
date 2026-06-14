# ADR-004: API Design Standards

**Status:** Accepted  
**Date:** 2026-06-14  
**Decision-Makers:** architecture-agent

## Context

Services expose REST APIs that must be consistent in style, versioning, error handling, pagination, and documentation. Without consistent standards, clients and API gateways must handle divergent patterns.

## Decision

### URL Structure

```
/api/v{major}/{resource}[/{resource-id}][/{sub-resource}]
```

Examples:
```
GET    /api/v1/orders
GET    /api/v1/orders/{orderId}
GET    /api/v1/orders/{orderId}/items
POST   /api/v1/orders
PUT    /api/v1/orders/{orderId}
DELETE /api/v1/orders/{orderId}
```

### Resource Naming

- Plural nouns: `/orders`, `/customers`, `/products`.
- kebab-case for multi-word resources: `/shipping-addresses`, `/payment-methods`.
- No verbs: `/createOrder` → `POST /api/v1/orders`.

### HTTP Methods

| Method | Semantics | Idempotent | Safe |
|---|---|---|---|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create resource or trigger action | No | No |
| PUT | Full replacement | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

### Versioning Strategy

See `skills/api/api-versioning.md` for full details. Summary:
- URL prefix versioning (`/api/v1/`, `/api/v2/`).
- Bump major version for breaking changes only.
- Additive changes (new fields, new endpoints) are safe within a version.
- Deprecation headers (Sunset, Deprecation) required on old versions.
- Minimum support window: 6 months (internal), 12 months (public).

### Error Response Format (RFC 9457)

```json
{
    "type": "https://api.example.com/errors/order-not-found",
    "title": "Order not found",
    "status": 404,
    "detail": "Order 123e4567-e89b-12d3-a456-426614174000 was not found",
    "instance": "/api/v1/orders/123e4567-e89b-12d3-a456-426614174000",
    "traceId": "abc123def456"
}
```

Standard error types:
- `https://errors.example.com/validation-error` → 400
- `https://errors.example.com/resource-not-found` → 404
- `https://errors.example.com/conflict` → 409
- `https://errors.example.com/unprocessable-entity` → 422
- `https://errors.example.com/internal-error` → 500

### Pagination

- **Offset-based** for low-volume collections (< 10K items): `?page=0&size=20`.
- **Cursor-based** for high-volume collections: `?cursor=eyJpZCI6IjEyMyJ9&limit=20`.
- Response includes pagination metadata in the body, not headers.

Offset response:
```json
{
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
}
```

Cursor response:
```json
{
    "content": [...],
    "nextCursor": "eyJsYXN0SWQiOiI0NTYifQ==",
    "hasMore": true
}
```

### Sorting and Filtering

```http
GET /api/v1/orders?sort=createdAt,desc&status=CONFIRMED&customerId=uuid
```

- Sort: `sort=field,direction` (repeatable for multi-sort).
- Filter: `field=value` for exact match, `field=value1,value2` for IN.
- Range: `field=gte:value` or `field=lte:value`.
- All filtering by exact match unless documented otherwise.

### Request IDs and Tracing

- Clients may send `X-Request-Id` header for request correlation.
- Service propagates it as `traceId` in logs, metrics, and error responses.
- If not provided, service generates a UUID.

### Response Headers

| Header | When |
|---|---|
| `Location` | POST operations (201 Created) |
| `Deprecation` | Deprecated endpoints (`true`) |
| `Sunset` | Deprecated endpoints (RFC 8594 date) |
| `Link` | Deprecated endpoints (rel="successor-version") |
| `X-Request-Id` | All responses |
| `Cache-Control` | GET responses when caching is appropriate |

## Consequences

**Positive:**
- Consistent API surface across all services.
- Auto-discoverable via OpenAPI specification.
- Predictable error handling for clients.
- Clear deprecation and migration path.

**Negative:**
- URL prefix versioning duplicates code across versions.
- Cursor-based pagination adds client complexity.
- RFC 9457 requires mapping domain exceptions to standard error types.

## Compliance

- All services must follow `/api/v{major}/{resource}` URL pattern.
- All errors must use RFC 9457 problem+json format.
- All list endpoints must paginate.
- OpenAPI 3.1 spec must be available at `/v3/api-docs`.
- Breaking changes must create a new API version.
