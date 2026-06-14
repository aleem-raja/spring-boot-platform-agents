# Helm

## Purpose

Package Kubernetes deployments as reusable Helm charts with environment-specific configuration overrides for Spring Boot services.

## When to Use

- Managing multiple environments (dev, staging, prod) with different configurations.
- Distributing a service chart across teams or clusters.
- When deployment configuration needs versioning, rollback, and dependency management.

## Best Practices

### Chart Structure

```
customer-service/
├── Chart.yaml          # Metadata: name, version, description, dependencies
├── values.yaml         # Default values
├── values-dev.yaml     # Dev overrides
├── values-staging.yaml # Staging overrides
├── values-prod.yaml    # Production overrides
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── configmap.yaml
│   ├── secret.yaml     # Template only; values from external secret store
│   ├── _helpers.tpl    # Named templates for labels, names
│   └── tests/
│       └── test-connection.yaml
└── charts/             # Subcharts (if any)
```

### Values Organization

Group values by concern with clear defaults that work for local development:

```yaml
# values.yaml
replicaCount: 1

image:
  repository: registry.example.com/customer-service
  tag: latest
  pullPolicy: IfNotPresent

service:
  port: 8080

ingress:
  enabled: false

resources:
  requests:
    memory: 512Mi
    cpu: 250m
  limits:
    memory: 1Gi
    cpu: 500m

probes:
  startup:
    failureThreshold: 30
    periodSeconds: 10
  liveness:
    failureThreshold: 3
    periodSeconds: 15
  readiness:
    failureThreshold: 3
    periodSeconds: 10

env:
  SPRING_PROFILES_ACTIVE: dev
  JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

migration:
  enabled: true
```

Environment overrides should change only what differs:

```yaml
# values-prod.yaml
replicaCount: 6
resources:
  requests:
    memory: 2Gi
    cpu: 1000m
  limits:
    memory: 2Gi
    cpu: 2000m
env:
  SPRING_PROFILES_ACTIVE: prod
ingress:
  enabled: true
  host: api.example.com
```

### Using Helmfile or --values

```bash
# Install with environment override
helm install customer-service ./charts/customer-service \
  --values ./charts/customer-service/values-prod.yaml

# Upgrade with diff preview
helm diff upgrade customer-service ./charts/customer-service \
  --values ./charts/customer-service/values-prod.yaml

# Rollback
helm rollback customer-service 1
```

### Migration Hooks

Use Helm hooks to run Flyway migrations before the application deploys:

```yaml
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}-migration"
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["java", "-jar", "app.jar", "--spring.flyway.clean-disabled=true"]
          env:
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-db
                  key: url
```

## Anti-Patterns

- Baking secrets into values.yaml — use external secret stores (Vault, SealedSecrets, External Secrets Operator) and reference them as templates.
- One massive values.yaml with no environment separation — split by environment file.
- Not pinning chart version in dependencies — use `version:` constraints to prevent breaking changes from upstream charts.
- Using `latest` image tag in production — always use Git SHA or SemVer tags.
- No `helm diff` before apply — always preview changes to catch unintended modifications.
- Skipping chart testing — add `templates/test/` with connection tests that run after deploy.

## Examples

```bash
# Create a new chart scaffold
helm create customer-service

# Template rendering (validate without installing)
helm template customer-service ./charts/customer-service \
  --values ./charts/customer-service/values-prod.yaml

# Lint chart
helm lint ./charts/customer-service

# Package for distribution
helm package ./charts/customer-service -d ./dist/
```
