# OAuth2 / JWT

## Purpose

Secure Spring Boot REST APIs using OAuth2 and JWT bearer token authentication and authorization, with support for token refresh, opaque token introspection, and client credentials flow.

## When to Use

- Every REST API that handles authenticated requests.
- Required for any service exposed to external clients or the public internet.
- Use with an authorization server (Keycloak, Auth0, Cognito, custom OAuth2 provider).

## Best Practices

### JWT Resource Server

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/service
          # jwk-set-uri: https://auth.example.com/realms/service/protocol/openid-connect/certs
```

Spring Boot auto-fetches the JWKS from the issuer's `/.well-known/openid-configuration`. Validate `iss`, `aud`, `exp`, `nbf`, and `iat` automatically.

### Token Refresh

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final RestClient restClient;

    public AuthController(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://auth.example.com").build();
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody RefreshRequest request) {
        var body = Map.of(
            "grant_type", "refresh_token",
            "refresh_token", request.refreshToken(),
            "client_id", "service-client",
            "client_secret", "service-secret"
        );
        return restClient.post()
            .uri("/realms/service/protocol/openid-connect/token")
            .body(body)
            .retrieve()
            .body(TokenResponse.class);
    }
}
```

### Opaque Token Introspection

Use opaque tokens when token revocation is required. The resource server calls the authorization server's introspection endpoint on each request:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        opaque-token:
          introspection-uri: https://auth.example.com/realms/service/protocol/openid-connect/token/introspect
          client-id: service-client
          client-secret: service-secret
```

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .opaqueToken(Customizer.withDefaults())
            )
            .csrf(csrf -> csrf.disable())
            .build();
    }
}
```

### Client Credentials Flow (Service-to-Service)

```java
@Service
public class OrderServiceClient {
    private final RestClient restClient;

    public OrderServiceClient(RestClient.Builder builder,
                               ClientRegistrationRepository registrations,
                               OAuth2AuthorizedClientRepository authorized) {
        var provider = new AuthenticatedPrincipalOAuth2AuthorizedClientRepository(authorized);
        var manager = new DefaultOAuth2AuthorizedClientManager(registrations, provider);

        this.restClient = builder.build();
    }

    public OrderResponse getOrder(UUID orderId) {
        var token = fetchClientCredentialsToken();
        return restClient.get()
            .uri("http://order-service/api/v1/orders/{id}", orderId)
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .body(OrderResponse.class);
    }

    private String fetchClientCredentialsToken() {
        // Use OAuth2AuthorizedClientManager with client_credentials grant
        var request = new OAuth2AuthorizeRequest
            .withClientRegistrationId("order-service")
            .principal("service-account")
            .build();
        var client = authorizedClientManager.authorize(request);
        return client.getAccessToken().getTokenValue();
    }
}
```

### Security Configuration (Complete)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SecurityProperties props) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig(props.cors())))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api/v*/public/**").permitAll()
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
        var granted = new JwtGrantedAuthoritiesConverter();
        granted.setAuthoritiesClaimName("roles");
        granted.setAuthorityPrefix("ROLE_");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(granted);
        return converter;
    }

    private CorsConfigurationSource corsConfig(CorsProperties cors) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(cors.allowedOrigins());
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

### Method Security with SpEL

```java
@PreAuthorize("hasAuthority('SCOPE_customer:read')")
@PreAuthorize("hasRole('ADMIN')")
@PreAuthorize("@orderSecurity.canRead(#id, authentication.name)")
@PostAuthorize("returnObject.owner == authentication.name")
@PostFilter("filterObject.owner == authentication.name")
```

### Extracting User Info from JWT

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwt) {
            return new UserResponse(
                jwt.getToken().getSubject(),
                jwt.getToken().getClaimAsString("email"),
                jwt.getToken().getClaimAsStringList("roles")
            );
        }
        throw new UnauthorizedException("Not authenticated");
    }
}
```

## Anti-Patterns

- Writing custom JWT parsing or validation — Spring Security's resource server handles this correctly.
- Embedding user passwords or secrets in JWTs — tokens are signed, not encrypted.
- Accepting JWTs without issuer validation — any token signed by any key would be accepted.
- Using JWTs for sessions without revocation strategy — use opaque tokens or short-lived JWTs + refresh flow.
- Storing JWTs in localStorage (XSS vulnerability) — use HTTP-only cookies for web applications.
- Disabling CSRF protection for APIs without understanding the trade-offs — CSRF is disabled for stateless APIs using JWT, but must be explicitly configured.
- Hardcoding client secrets in configuration — use secrets management (Vault, K8s secrets, env vars).
- Long-lived access tokens (hours/days) — use 15-minute tokens with refresh flow.
- Ignoring token replay attacks — use `jti` (JWT ID) for token replay detection in high-security environments.

## Application Checklist

- `spring-boot-starter-oauth2-resource-server` dependency added
- JWT issuer URI configured
- `@EnableMethodSecurity` on `@Configuration` class
- `@PreAuthorize` on all controller endpoints
- CORS configured for known origins
- HTTP security headers configured (HSTS, CSP, X-Frame-Options)
- Token refresh endpoint available
- Opaque token introspection for high-security APIs (if needed)
- Client credentials flow for service-to-service auth
- No hardcoded secrets — all credentials from environment
- Short-lived access tokens (15 min) with refresh
