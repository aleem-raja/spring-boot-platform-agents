# Kubernetes

## Purpose

Deploy and operate Spring Boot services on Kubernetes with production-grade configuration.

## When to Use

- Production deployment of microservices requiring horizontal scaling, self-healing, and rolling updates.
- When service requires canary deployments, blue/green deployment, or A/B testing.
- When infrastructure team manages a Kubernetes cluster (self-managed or managed: EKS, AKS, GKE).

## Best Practices

- Use Deployment resources with `replicas: 3` minimum for production availability.
- Define resource requests and limits for every container — no unbounded resource usage.
- Configure liveness, readiness, and startup probes using `/actuator/health` endpoints.
- Use ConfigMaps for non-sensitive configuration; Secrets for sensitive data.
- Use HorizontalPodAutoscaler with CPU/memory metrics and custom Prometheus metrics.
- Use PodDisruptionBudget for voluntary disruption control (node maintenance, cluster upgrades).
- Use Istio or Linkerd for mTLS, traffic splitting, and observability in service mesh architectures.
- Use Helm or Kustomize for environment-specific manifest customization.
- Use `terminationGracePeriodSeconds` to allow graceful shutdown (Spring Boot's `server.shutdown=graceful`).

## Anti-Patterns

- Running as root user — add `securityContext.runAsNonRoot: true` and `runAsUser: 1000`.
- No resource limits — a memory leak in one pod can starve the entire node.
- Using `latest` image tag — Kubernetes cannot determine which version is running. Use Git SHA or SemVer tags.
- Environment-specific configuration in container image — use ConfigMaps and Secrets injected at deploy time.
- Stateful workloads without StatefulSet — use StatefulSet for databases; Deployment for stateless services.
- Skipping PodDisruptionBudget — cluster autoscaler or node upgrades can terminate all pods simultaneously.

## Examples

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: customer-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 30
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: app
          image: registry.example.com/customer-service:v1.2.3
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
          resources:
            requests:
              memory: 512Mi
              cpu: 250m
            limits:
              memory: 1Gi
              cpu: 500m
          startupProbe:
            httpGet:
              path: /actuator/health/startup
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            periodSeconds: 5
            failureThreshold: 2
```

**HorizontalPodAutoscaler:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: customer-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: customer-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```
