# Spring Boot Platform Agents

Vendor-neutral AI engineering platform for building production-grade Spring Boot services.
Works with OpenCode, Claude Code, Codex, Cursor, Gemini CLI, Cline, Roo Code, and Continue.

## Default Stack

Java 25 · Spring Boot 4 · PostgreSQL · OpenAPI · Testcontainers · Docker · OpenTelemetry · Micrometer · Prometheus · Grafana

## Structure

```
agents/          -- Agent definitions (architect, implementation-engineer, test-engineer, etc.)
skills/          -- On-demand domain knowledge (java, spring, persistence, testing, etc.)
playbooks/       -- Multi-step workflow orchestrators (create-service, add-feature, etc.)
standards/       -- Cross-cutting rules (architecture, coding, engineering)
templates/       -- Code scaffolds for service generation
docs/adr/        -- Architecture Decision Records
```

## Quick Start

```bash
# 1. Clone this repository alongside your service repository
git clone <this-repo> ~/spring-boot-platform-agents

# 2. Start OpenCode in your service project
cd ~/my-service
opencode .

# 3. Use a playbook
#    "Use the create-service playbook. Create a Customer Service."
```

## Playbooks

| Playbook | Purpose |
|---|---|
| create-service | Scaffold new Spring Boot service |
| add-feature | Add feature to existing service |
| review-pr | Review pull request changes |
| fix-cve | Remediate security vulnerabilities |
| upgrade-java | Upgrade Java version |
| upgrade-spring | Upgrade Spring Boot version |
| deploy-service | Deploy service to environment |
| generate-docs | Generate service documentation |

## Agents

| Agent | Role |
|---|---|
| architect | Design service architecture |
| implementation-engineer | Write production code |
| test-engineer | Write and run tests |
| security-engineer | Review security posture |
| performance-engineer | Optimize performance |
| sre-engineer | Define operations contracts |
| release-engineer | Manage release pipeline |
| code-reviewer | Review code quality |

## Standards

- [Architecture Standard](standards/architecture-standard.md) — service structure, API design, persistence rules
- [Coding Standard](standards/coding-standard.md) — Java 25 conventions, null safety, exception handling
- [Engineering Standard](standards/engineering-standard.md) — branch strategy, PR standards, definition of done, incident response
