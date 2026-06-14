# Spring Security

## Purpose

Secure Spring Boot services with authentication, authorization, CORS, CSRF protection, and HTTP security headers using Spring Security 7+ (Spring Boot 4).

## When to Use

- Every service that exposes HTTP endpoints, even internally.
- Required by security-engineer during review and fix-cve playbooks.
- Required by implementation-engineer for endpoint security configuration.

## Best Practices

### Resource Server Configuration (JWT)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers(GET, "/api/v*/public/**").permitAll()
                .requestMatchers("/api/v*/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter()))
            )
            .headers(headers -> headers
                .frameOptions(f -> f.deny())
                .xssProtection(xss -> xss.enable())
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
            );
        return http.build();
    }

    private JwtAuthenticationConverter jwtConverter() {
        var grantedAuthorities = new JwtGrantedAuthoritiesConverter();
        grantedAuthorities.setAuthoritiesClaimName("roles");
        grantedAuthorities.setAuthorityPrefix("ROLE_");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthorities);
        return converter;
    }

    private CorsConfigurationSource corsConfig() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### Method Security

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @GetMapping("/{id}")
    @PreAuthorize("@orderSecurity.canRead(#id, authentication.name)")
    public OrderResponse getById(@PathVariable UUID id) { ... }

    @PostMapping
    @PreAuthorize("hasRole('ORDER_MANAGER')")
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) { ... }
}

@Component("orderSecurity")
public class OrderSecurity {
    public boolean canRead(UUID orderId, String principal) {
        // Check ownership, team membership, etc.
        return true;
    }
}
```

### CORS Configuration

```yaml
spring:
  cors:
    allowed-origins: https://app.example.com
    allowed-methods: GET,POST,PUT,DELETE,PATCH
    allowed-headers: "*"
    allow-credentials: true
    max-age: 3600
```

### CSRF Protection

- Disable CSRF for stateless APIs (JWT/OAuth2).
- Enable CSRF for session-based auth (Thymeleaf, server-rendered pages).
- Use `@CookieCsrfTokenRepository` or `@CsrfTokenRepository` for SPA + session.

### HTTP Security Headers

| Header | Value | Purpose |
|---|---|---|
| Strict-Transport-Security | max-age=63072000; includeSubDomains | Enforce HTTPS |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Clickjacking protection |
| Cache-Control | no-store | Prevent caching of sensitive responses |
| Content-Security-Policy | default-src 'self' | XSS mitigation |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |

### OAuth2 Client (Service-to-Service)

```java
@Bean
public SecurityFilterChain clientFilterChain(HttpSecurity http) throws Exception {
    http.oauth2Client(oauth2 -> oauth2
        .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
        .tokenEndpoint(token -> token
            .accessTokenResponseClient(clientCredentialsTokenResponseClient())
        )
    );
    return http.build();
}

@Bean
public OAuth2AuthorizedClientManager authorizedClientManager(
        ClientRegistrationRepository clients, OAuth2AuthorizedClientRepository authorized) {
    var provider = new AuthenticatedPrincipalOAuth2AuthorizedClientRepository(authorized);
    return new DefaultOAuth2AuthorizedClientManager(clients, provider);
}
```

### Password Encoding

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12); // strength 12 (default 10)
}
```

## Anti-Patterns

- **@EnableWebSecurity without @EnableMethodSecurity** — method-level authorization is the most granular and testable approach.
- **PermitAll on /actuator/** — expose only specific endpoints like health/info. Never expose /actuator/env, /actuator/configprops.
- **Hardcoded secrets in SecurityConfig** — use `@Value` or `@ConfigurationProperties`.
- **CORS with `allowedOrigins("*")` and `allowCredentials(true)`** — incompatible. Specify explicit origins.
- **Rolling your own authentication filter** — use Spring Security's built-in filters. Custom filters often introduce vulnerabilities.
- **Exposing stack traces in error responses** — always map to problem+json with generic messages.

## Application Checklist

- `@EnableWebSecurity` + `@EnableMethodSecurity` configured
- JWT token validation with correct issuer URI
- CORS configured for known origins only
- CSRF disabled (stateless API) or enabled (session-based)
- HTTP security headers set (HSTS, CSP, X-Frame-Options, etc.)
- Actuator endpoints restricted (only health, info, prometheus exposed)
- Method-level authorization (`@PreAuthorize`) on all endpoints
- `SecurityContextHolder.getContext().getAuthentication()` never returns null for authenticated endpoints
- Password encoder configured (if user management present)
- Content Security Policy compatible with frontend assets
