# Docker Compose

## Purpose

Define and run multi-container Spring Boot service stacks for local development and CI environments.

## When to Use

- Local development: run service with PostgreSQL, Kafka, Redis, and other dependencies.
- CI environment: integration tests requiring multiple services.
- Pre-production validation: full-stack integration before Kubernetes deployment.

## Best Practices

- Define services in `docker-compose.yml` with explicit image tags (never `latest`).
- Use health checks for service readiness: `condition: service_healthy` in `depends_on`.
- Use named volumes for persistent data (database, Kafka logs).
- Use `.env` file for environment-specific configuration (never commit secrets to git).
- Use `profiles` for optional services (monitoring stack, debug tools).
- Use `build: .` with Dockerfile for the service itself; reference pre-built images for dependencies.
- Limit resource usage with `deploy.resources.limits` in CI environments.
- Use `networks` to isolate service groups.

## Anti-Patterns

- Using `latest` image tags — non-deterministic builds. Pin to major.minor tags.
- No health checks — services start in undefined order; tests fail intermittently.
- Mounting host directories as volume mounts in CI — file permission issues.
- Committing `.env` files with secrets to version control.
- Running everything in default network — use custom networks for service isolation.
- No resource limits in shared CI environments — one service can exhaust host resources.

## Examples

```yaml
version: "4"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/service
      SPRING_DATASOURCE_USERNAME: service
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
      kafka:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  db:
    image: postgres:17
    environment:
      POSTGRES_DB: service
      POSTGRES_USER: service
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U service"]
      interval: 5s
      timeout: 3s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0

volumes:
  pgdata:
```
