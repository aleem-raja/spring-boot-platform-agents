# Kubernetes

## Purpose

Deploy and operate Spring Boot services on Kubernetes with production-grade configuration including health probes, graceful shutdown, resource management, and autoscaling.

## When to Use

- Production deployment of microservices requiring horizontal scaling, self-healing, and rolling updates.
- When service requires canary deployments, blue/green deployment, or A/B testing.
- When infrastructure team manages a Kubernetes cluster (self-managed or managed: EKS, AKS, GKE).

## Best Practices

### Three Distinct Probes

Spring Boot apps require three probes because JVM startup is slow, but runtime failures must be detected quickly:

- **startupProbe** — Gates liveness/readiness activation. Gives the JVM warmup time without being killed. Calculate `failureThreshold × periodSeconds` to cover your worst-case startup time. Default: 30 failures × 10s = 5 minutes.
- **livenessProbe** — Detects unrecoverable state (deadlock, corruption, OOM). If this fails, Kubernetes restarts the pod. Use `/actuator/health/liveness`.
- **readinessProbe** — Determines if the pod can serve traffic. Fail this when database connection pool is cold, circuit breaker is open, or downstream dependency is unhealthy. Use `/actuator/health/readiness`.

### Graceful Shutdown

Without graceful shutdown, in-flight requests are terminated mid-response during rolling updates, causing 502 errors.

1. Enable Spring Boot graceful shutdown:
```yaml
server.shutdown: graceful
spring.lifecycle.timeout-per-shutdown-phase: 30s
```

2. Add `preStop` hook to close the endpoint-propagation race condition:
```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 10"]
```

The `preStop` sleep delays SIGTERM by 10 seconds. During those seconds, the readiness probe fails, Kubernetes removes the pod from the Service, and kube-proxy propagates the removal across all nodes. Without this sleep, new requests can arrive at the shutting-down pod.

3. Set `terminationGracePeriodSeconds` to cover preStop + Spring's timeout + safety margin:
```yaml
terminationGracePeriodSeconds: 60
```

With 10s preStop + 30s Spring timeout + 20s margin = 60s total.

### JVM Configuration for Containers

Never hardcode `-Xmx` in container environments. Use `MaxRAMPercentage` so the JVM adapts to the container's memory limit:

```yaml
env:
  - name: JAVA_TOOL_OPTIONS
    value: "-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=50 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
```

- `MaxRAMPercentage=75` — Use 75% of container memory for heap; the remaining 25% covers Metaspace, thread stacks, Netty off-heap, and JVM internals.
- `InitialRAMPercentage=50` — Start with 50% to avoid aggressive early GC cycles during warmup.
- `UseG1GC` — G1 is the default, but explicitly set it for production clarity.
- `ExitOnOutOfMemoryError` — Crash-and-restart instead of hanging in a corrupted state.
- `java.security.egd` — Uses non-blocking `/dev/./urandom` for faster startup on Linux.

### Resource Management

Set `requests = limits` (Guaranteed QoS class) for JVM services. Burstable QoS (requests < limits) can cause OOM kills when the node is under memory pressure because Kubernetes may throttle burstable pods first.

```yaml
resources:
  requests:
    memory: 1Gi
    cpu: 500m
  limits:
    memory: 1Gi
    cpu: 1000m
```

Rule of thumb: memory request = memory limit. CPU limit can be 2x request for burst capacity.

### Pod Topology Spread

Spread pods across availability zones and nodes to survive infrastructure failures:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: DoNotSchedule
```

### HorizontalPodAutoscaler

CPU-based HPA is often a poor fit for microservices: a Spring Boot service under heavy database I/O may be saturated at 20% CPU. Use custom Prometheus metrics instead:

```yaml
metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: 100
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

### PodDisruptionBudget

Prevent voluntary disruptions (node maintenance, cluster upgrades) from taking down all replicas:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: customer-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: customer-service
```

### Init Containers for Migrations

Run database migrations as an init container before the application pod starts:

```yaml
initContainers:
  - name: flyway-migration
    image: registry.example.com/customer-service:v1.2.3
    command: ["java", "-jar", "app.jar", "--spring.flyway.clean-disabled=true"]
    env:
      - name: SPRING_DATASOURCE_URL
        valueFrom:
          secretKeyRef:
            name: db-secret
            key: url
```

## Anti-Patterns

- Liveness probe with `initialDelaySeconds` shorter than app startup time — causes CrashLoopBackOff. Use startup probe instead.
- No preStop hook — rolling updates drop in-flight requests (502 errors in APM).
- Hardcoded `-Xmx` — JVM ignores container memory limits, causing OOM kills when limits are lower than Xmx.
- CPU limits below 1000m — G1GC uses parallel GC threads; too few CPUs throttle garbage collection and cause latency spikes.
- No PDB — cluster autoscaler or node upgrades can terminate all pods simultaneously.
- Running as root — use `securityContext.runAsNonRoot: true` and `runAsUser: 1000`.

## Examples

See `templates/service/Dockerfile` and the `deploy-service` playbook.

Complete deployment YAML at `examples/k8s/deployment.yaml` (planned).
