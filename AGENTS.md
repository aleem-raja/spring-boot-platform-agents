# Spring Boot Platform Agents

Orchestration layer for AI coding agents building Spring Boot services.

## Mission

Build maintainable production-grade Spring Boot services.

## Default Stack

- Java 25 (LTS)
- Spring Boot 4
- PostgreSQL
- OpenAPI
- Testcontainers
- Docker
- OpenTelemetry
- Micrometer / Prometheus / Grafana

## Workflow

1. Determine task type from user request
2. Load required playbook from `playbooks/`
3. Load required agents from `agents/`
4. Load required skills from `skills/`
5. Generate solution following loaded standards from `standards/`

## Playbooks

| Playbook | File | Purpose |
|---|---|---|
| create-service | `playbooks/create-service` | Scaffold new Spring Boot service |
| add-feature | `playbooks/add-feature` | Add feature to existing service |
| review-pr | `playbooks/review-pr` | Review pull request changes |
| fix-cve | `playbooks/fix-cve` | Remediate security vulnerabilities |
| upgrade-java | `playbooks/upgrade-java` | Upgrade Java version |
| upgrade-spring | `playbooks/upgrade-spring` | Upgrade Spring Boot version |
| deploy-service | `playbooks/deploy-service` | Deploy service to environment |
| generate-docs | `playbooks/generate-docs` | Generate service documentation |

## Agents

| Agent | File | Role |
|---|---|---|
| architect | `agents/architect` | Design service architecture |
| implementation-engineer | `agents/implementation-engineer` | Write production code |
| test-engineer | `agents/test-engineer` | Write and run tests |
| security-engineer | `agents/security-engineer` | Review security posture |
| performance-engineer | `agents/performance-engineer` | Optimize performance |
| sre-engineer | `agents/sre-engineer` | Define operations contracts |
| release-engineer | `agents/release-engineer` | Manage release pipeline |
| code-reviewer | `agents/code-reviewer` | Review code quality |

## Skill Categories

| Category | Load When |
|---|---|
| `skills/api/` | Designing API contracts and versioning |
| `skills/architecture/` | Designing service structure |
| `skills/java/` | Writing Java code |
| `skills/spring/` | Using Spring Boot features |
| `skills/persistence/` | Working with databases |
| `skills/testing/` | Writing tests |
| `skills/security/` | Implementing security |
| `skills/observability/` | Adding monitoring |
| `skills/cicd/` | Configuring CI/CD |
| `skills/deployment/` | Deploying services |
| `skills/documentation/` | Generating docs |
| `skills/git/` | Managing version control |
| `skills/modernization/` | Upgrading dependencies |

## Rules

- Load only files relevant to the task. Do not load the entire repository.
- When a task matches a playbook, load the playbook first, then its required agents and skills.
- Agents are loaded only when their agent file is referenced by a playbook or user request.
- Skills are loaded on demand. Do not pre-load all skills.
- Use ADRs in `docs/adr/` to document architectural decisions.
- Standards in `standards/` apply globally across all playbooks and agents.
