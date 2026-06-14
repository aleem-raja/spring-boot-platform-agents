# Deploy Service Playbook

Deploy a Spring Boot service to a target environment (development, staging, production).

## Required Agents

- release-engineer — manage versioning and release pipeline
- sre-engineer — verify observability and operational readiness
- performance-engineer — verify performance baselines

## Required Skills

- `skills/deployment/docker-compose` — container build and local deployment
- `skills/deployment/kubernetes` — production deployment manifests
- `skills/cicd/github-actions` — CI/CD pipeline configuration
- `skills/observability/opentelemetry` — observability configuration
- `skills/observability/micrometer-prometheus` — metrics and dashboards

## Workflow

1. **release-engineer: Tag and build**
   - Create release version tag (SemVer)
   - Build Docker image with version tag
   - Push image to container registry
   - Update CHANGELOG

2. **sre-engineer: Verify deployment prerequisites**
   - Confirm health endpoints configured
   - Confirm resource limits set
   - Confirm Prometheus metrics endpoint enabled
   - Confirm structured logging configured
   - Confirm readiness/liveness probes defined

3. **release-engineer: Deploy to staging**
   - Apply Kubernetes manifests or Docker Compose config
   - Run smoke tests against staging
   - Verify metrics and traces are emitted

4. **sre-engineer: Verify staging**
   - Check health of all replicas
   - Verify database connection
   - Verify message broker connectivity
   - Run integration tests against staging

5. **release-engineer: Deploy to production**
   - Apply canary deployment (5% → 25% → 100%)
   - Monitor error budget during canary rollout
   - Auto-rollback if error budget is exceeded

6. **sre-engineer: Verify production**
   - Confirm all metrics are reporting
   - Confirm traces are sampled correctly
   - Confirm alerting rules are active

## Outputs

- Docker image in container registry
- Kubernetes manifests applied
- Prometheus recording/alerting rules
- Grafana dashboard
- Deployment runbook
- Smoke test results
