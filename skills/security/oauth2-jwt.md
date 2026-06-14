# OAuth2 / JWT

## Purpose

Secure Spring Boot REST APIs using OAuth2 and JWT bearer token authentication and authorization.

## When to Use

- Every REST API that handles authenticated requests.
- Required for any service exposed to external clients or the public internet.
- Use with an authorization server (Keycloak, Auth0, Cognito, custom OAuth2 provider).

## Best Practices

- Use `spring-boot-starter-oauth2-resource-server` for JWT validation — never parse JWTs manually.
- Configure JWT issuer URI pointing to the authorization server's well-known configuration.
- Validate `iss`, `aud`, `exp`, `nbf`, and `iat` claims — Spring Boot does this automatically when issuer-uri is configured.
- Use scope-based authorization with method-security annotations: `@PreAuthorize("hasAuthority('SCOPE_customer:read')")`.
- Use opaque tokens (introspection) for high-security APIs where revocation is required.
- Store JWTs client-side (HTTP-only cookies for web apps, Authorization header for APIs).
- Rotate signing keys regularly — authorization servers should publish JWKS with key rotation.
- Use short token lifetimes (15 minutes for access tokens, 7 days for refresh tokens).

## Anti-Patterns

- Writing custom JWT parsing or validation — Spring Security's resource server handles this correctly.
- Embedding user passwords or secrets in JWTs — tokens are signed, not encrypted.
- Accepting JWTs without issuer validation — any token signed by any key would be accepted.
- Using JWTs for sessions without revocation strategy — use opaque tokens or short-lived JWTs + refresh flow.
- Storing JWTs in localStorage (XSS vulnerability) — use HTTP-only cookies for web applications.
- Disabling CSRF protection for APIs without understanding the trade-offs — CSRF is disabled for stateless APIs using JWT, but must be explicitly configured.

## Examples

**application.yml:**
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/service
```

**Security config:**
```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .csrf(csrf -> csrf.disable())
            .build();
    }
}
```

**Method security:**
```java
@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_customer:read')")
    public CustomerResponse getById(@PathVariable UUID id) { ... }
}
```
