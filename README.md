# Spring Boot Platform Agents

Vendor-neutral AI engineering platform for building production-grade Spring Boot services.
Works with **OpenCode**, **Claude Code**, **Codex**, **Cursor**, **Gemini CLI**, **Cline**, **Roo Code**, and **Continue**.

## Default Stack

**Java 25** · **Spring Boot 4** · **PostgreSQL 17** · **OpenAPI 3.1** · **Testcontainers** · **Docker** · **OpenTelemetry** · **Micrometer / Prometheus / Grafana**

---

## Quick Start

### 1. Add to your project

```bash
# Clone alongside your service repo
git clone https://github.com/anomalyco/spring-boot-platform-agents.git .agents
```

### 2. Start your AI coding agent

```bash
# OpenCode (any directory)
opencode .

# Claude Code (any directory)
claude .

# Other agents read AGENTS.md for routing
```

### 3. Use a playbook

Ask your agent (in natural language):

> *"Use the create-service playbook. Build a Customer Management Service."*

The agent loads the playbook, assigns agents (architect → implementation-engineer → test-engineer → security-engineer), loads required skills on demand, and follows the phase-by-phase workflow.

### 4. Or use a specific agent mode

```bash
# Plan mode — architecture design
opencode . --mode plan "Design order service"

# Build mode — generate implementation
opencode . --mode build "Generate the order service code"

# Review mode — check pull request
opencode . --mode review

# Security review
opencode . --mode security

# Test generation
opencode . --mode test

# Performance analysis
opencode . --mode perf
```

---

## How It Works

```
You (natural language) → Agent Router → Playbook → Agents → Skills → Output
```

| Layer | What | Example |
|---|---|---|
| **Playbooks** | Multi-step workflows | `create-service`, `add-feature`, `review-pr` |
| **Agents** | Expert roles | `architect`, `implementation-engineer`, `test-engineer` |
| **Skills** | Domain knowledge loaded on demand | `jpa-hibernate`, `kafka`, `spring-security` |
| **Standards** | Cross-cutting rules | `architecture-standard`, `coding-standard` |
| **Templates** | Code scaffolds | `pom.xml`, `Dockerfile`, `application.yml` |

---

## Managing Skills via npx

The platform ships as an npm package with a CLI for managing skills.

### Install

```bash
# No install needed — use via npx
npx spring-boot-platform-agents help

# Or install globally
npm install -g spring-boot-platform-agents
```

### Commands

```bash
# List all skill categories
npx spring-boot-platform-agents list-categories

# List skills in a category
npx spring-boot-platform-agents list-skills persistence

# List all skills across all categories
npx spring-boot-platform-agents list-skills

# Add a new skill (creates a template file)
npx spring-boot-platform-agents add-skill messaging rabbitmq \
  --purpose "RabbitMQ integration patterns for Spring Boot"
```

The `add-skill` command scaffolds a new skill file with the standard template (Purpose, When to Use, Best Practices, Anti-Patterns, Examples, Checklist). Edit the generated file and register it in `AGENTS.md` if a new category is needed.

### Examples

```bash
# Create a websocket skill
npx sbp-agents add-skill spring websocket --purpose "WebSocket and STOMP messaging"

# Create a contract testing skill
npx sbp-agents add-skill testing contract-testing --purpose "Spring Cloud Contract and Pact"

# List all available skills
npx sbp-agents list-skills
```

---

## Playbooks

| Playbook | Purpose | Agents Used |
|---|---|---|
| [`create-service`](playbooks/create-service.md) | Scaffold new Spring Boot service | architect → impl → test → security |
| [`add-feature`](playbooks/add-feature.md) | Add feature to existing service | architect → impl → test |
| [`review-pr`](playbooks/review-pr.md) | Review pull request changes | code-reviewer → security |
| [`fix-cve`](playbooks/fix-cve.md) | Remediate security vulnerabilities | security → release |
| [`upgrade-java`](playbooks/upgrade-java.md) | Upgrade Java version | impl → test |
| [`upgrade-spring`](playbooks/upgrade-spring.md) | Upgrade Spring Boot version | impl → test |
| [`deploy-service`](playbooks/deploy-service.md) | Deploy service to environment | sre → release |
| [`generate-docs`](playbooks/generate-docs.md) | Generate service documentation | impl → test |

## Agents

| Agent | File | Role | Escalates To |
|---|---|---|---|
| **architect** | [`agents/architect.md`](agents/architect.md) | Design service architecture | — |
| **implementation-engineer** | [`agents/implementation-engineer.md`](agents/implementation-engineer.md) | Write production code | architect |
| **test-engineer** | [`agents/test-engineer.md`](agents/test-engineer.md) | Write and run tests | implementation-engineer |
| **security-engineer** | [`agents/security-engineer.md`](agents/security-engineer.md) | Review security posture | architect, platform, compliance |
| **performance-engineer** | [`agents/performance-engineer.md`](agents/performance-engineer.md) | Optimize performance | architect, SRE |
| **sre-engineer** | [`agents/sre-engineer.md`](agents/sre-engineer.md) | Define operations contracts | platform, security, performance |
| **release-engineer** | [`agents/release-engineer.md`](agents/release-engineer.md) | Manage release pipeline | architect, security, SRE |
| **code-reviewer** | [`agents/code-reviewer.md`](agents/code-reviewer.md) | Review code quality | architect, security |

## Skills by Category

| Category | Skills |
|---|---|
| **api** | [`api-versioning`](skills/api/api-versioning.md) |
| **architecture** | [`microservice-patterns`](skills/architecture/microservice-patterns.md) |
| **caching** | [`spring-cache`](skills/caching/spring-cache.md) |
| **cicd** | [`github-actions`](skills/cicd/github-actions.md), [`gitlab-ci`](skills/cicd/gitlab-ci.md), [`jenkins`](skills/cicd/jenkins.md) |
| **deployment** | [`docker-compose`](skills/deployment/docker-compose.md), [`helm`](skills/deployment/helm.md), [`kubernetes`](skills/deployment/kubernetes.md) |
| **documentation** | [`architecture-decision-records`](skills/documentation/architecture-decision-records.md), [`docs-pages`](skills/documentation/docs-pages.md), [`openapi`](skills/documentation/openapi.md), [`spring-restdocs`](skills/documentation/spring-restdocs.md) |
| **git** | [`conventional-commits`](skills/git/conventional-commits.md), [`trunk-based-development`](skills/git/trunk-based-development.md) |
| **java** | [`java25-modern`](skills/java/java25-modern.md) |
| **messaging** | [`kafka`](skills/messaging/kafka.md) |
| **modernization** | [`openrewrite`](skills/modernization/openrewrite.md), [`upgrade-java`](skills/modernization/upgrade-java.md), [`upgrade-spring`](skills/modernization/upgrade-spring.md) |
| **observability** | [`micrometer-prometheus`](skills/observability/micrometer-prometheus.md), [`opentelemetry`](skills/observability/opentelemetry.md) |
| **persistence** | [`flyway`](skills/persistence/flyway.md), [`jpa-hibernate`](skills/persistence/jpa-hibernate.md), [`liquibase`](skills/persistence/liquibase.md), [`postgresql`](skills/persistence/postgresql.md) |
| **resilience** | [`resilience4j`](skills/resilience/resilience4j.md) |
| **security** | [`oauth2-jwt`](skills/security/oauth2-jwt.md) |
| **spring** | [`spring-boot4`](skills/spring/spring-boot4.md), [`spring-security`](skills/spring/spring-security.md) |
| **testing** | [`integration-testing`](skills/testing/integration-testing.md), [`testcontainers`](skills/testing/testcontainers.md), [`unit-testing`](skills/testing/unit-testing.md) |
| **validation** | [`bean-validation`](skills/validation/bean-validation.md) |

## Standards

| Standard | Scope |
|---|---|
| [`architecture-standard.md`](standards/architecture-standard.md) | Service structure, hexagonal architecture, API design, persistence rules, tech decisions |
| [`coding-standard.md`](standards/coding-standard.md) | Java 25 conventions, null safety, exception handling, logging, naming |
| [`engineering-standard.md`](standards/engineering-standard.md) | Branch strategy (trunk-based), PR standards, definition of done, docs as code |

## Templates

| Template | Purpose |
|---|---|
| [`pom.xml`](templates/service/pom.xml) | Production Maven build with modular starters, OAuth2, Kafka, Resilience4j, Testcontainers, ArchUnit |
| [`Dockerfile`](templates/service/Dockerfile) | Multi-stage Docker build with JVM tuning |
| [`docker-compose.yml`](templates/service/docker-compose.yml) | Full dev environment (PostgreSQL, Kafka, OTel Collector, Prometheus, Grafana) |
| [`application.yml`](templates/service/application.yml) | Production config with 3 profiles (local, test, default) |
| [`logback-spring.xml`](templates/service/logback-spring.xml) | Structured JSON logging (Logstash) with dev plain-text profile |
| [`otel-collector-config.yml`](templates/otel/otel-collector-config.yml) | OpenTelemetry collector with OTLP, Prometheus, batch processing |

---

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR-001](docs/adr/ADR-001-vendor-neutral-agent-platform.md) | Vendor-neutral agent platform with 4-layer architecture |
| [ADR-002](docs/adr/ADR-002-trunk-based-development.md) | Trunk-based development (no GitFlow) |
| [ADR-003](docs/adr/ADR-003-testing-strategy.md) | Test pyramid with ArchUnit, Testcontainers, contract testing |
| [ADR-004](docs/adr/ADR-004-api-design.md) | API design: URL prefix versioning, RFC 9457 errors, pagination |

## Repository Layout

```
.
├── AGENTS.md                 # Orchestration rules (entry point for AI agents)
├── opencode.json             # Agent routing for OpenCode (plan/build/review/security/test/perf/sre)
├── package.json              # npm package with npx CLI for skill management
├── bin/cli.mjs               # CLI: add-skill, list-skills, list-categories
├── agents/                   # Expert role definitions (8 agents)
├── skills/                   # Domain knowledge loaded on demand (34 skills)
├── playbooks/                # Multi-step workflows (8 playbooks)
├── standards/                # Cross-cutting rules (3 standards)
├── templates/                # Code scaffolds (pom.xml, Dockerfile, k8s, otel, etc.)
├── docs/adr/                 # Architecture Decision Records (4 ADRs)
└── examples/                 # Reference implementations (GitLab CI pipeline, K8s manifests)
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Apache 2.0
