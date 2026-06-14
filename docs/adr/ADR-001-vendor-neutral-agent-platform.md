# ADR-001: Vendor-Neutral Agent Platform Architecture

## Status

Accepted

## Context

The platform must support multiple AI coding agents (OpenCode, Claude Code, Coder, Cursor, Gemini CLI, Cline, Roo Code, Continue) without being tied to any single vendor's format, conventions, or runtime. Each agent loads different file formats (AGENTS.md, CLAUDE.md, .cursorrules), uses different prompt injection mechanisms, and has different capability sets.

The following constraints drove this decision:

- No single agent vendor dominates the market; teams may switch agents between projects or over time.
- Each agent has different file-loading semantics (AGENTS.md vs CLAUDE.md vs .cursorrules).
- Token budgets vary across agents and models; the platform must minimize unnecessary loading.
- Skills and playbooks should be reusable regardless of which agent orchestrates them.

## Decision

Adopt a **vendor-neutral file-based architecture** with four independent layers:

### Layer 1: Orchestration (AGENTS.md / CLAUDE.md)

A lightweight routing file that lists available assets and instructs the agent to load playbooks, agents, and skills on demand. The format uses vendor-agnostic Markdown conventions that render usefully in any agent's context.

- AGENTS.md is the primary entry point for OpenCode and Claude Code.
- No vendor-specific directives (no agent-specific XML tags, no JSON blocks for a single tool).
- Keep under 80 lines to minimize token consumption.

### Layer 2: Playbooks (playbooks/*.md)

Workflow documents that orchestrate multi-step processes by referencing agents and skills. Playbooks are the only files that reference specific agent names.

- Each playbook lists required agents, required skills, a numbered workflow, and expected outputs.
- Playbooks are loaded only when the task matches their name.

### Layer 3: Agents (agents/*.md)

Role-specific instruction files that define responsibilities, decision criteria, escalation rules, and required skills.

- Agents are loaded only when referenced by a playbook or explicitly requested.
- Each agent has a single responsibility; complex tasks compose multiple agents.

### Layer 4: Skills (skills/**/*.md)

Reusable knowledge documents loaded on demand. Skills contain purpose, when-to-use guidance, best practices, anti-patterns, and examples.

- Skills never reference agent names — they are pure domain knowledge.
- Grouped by category directory (java/, spring/, persistence/, etc.).
- Load only the skill files needed for the current task.

### Supporting Layers

- standards/ — Cross-cutting rules applied by all agents. Never loaded as standalone files; referenced by playbooks.
- templates/ — File scaffolds for code generation. Loaded by implementation-engineer.
- docs/adr/ — Architecture Decision Records documenting significant choices.

## Consequences

### Positive

- Agents can be swapped without rewriting content. The same playbook works under OpenCode and Claude Code.
- Token usage scales with task complexity, not directory size. A simple CVE fix loads 2 files; a new service loads 5-8.
- Skills are independently maintainable and testable. A Java upgrade skill can be updated without touching agent definitions.
- New agent vendors can be supported by adding an orchestration file; existing playbooks, agents, and skills need no changes.

### Negative

- Requires agents to support file-level loading. Agents that pre-load entire directories will not benefit from on-demand loading.
- Playbooks must be manually kept in sync with available agents and skills. No automated validation.
- Initial setup requires creating layered content rather than writing one large prompt.

## Alternatives Considered

### Monolithic Prompt File

A single AGENTS.md containing all instructions for all scenarios.

- Rejected: Token costs scale linearly with content. A 200-line prompt for every session wastes budget on irrelevant scenarios.

### Vendor-Specific Formats

Separate AGENTS.md for OpenCode, CLAUDE.md for Claude Code, .cursorrules for Cursor.

- Rejected: Triple maintenance burden. Teams switching agents must keep multiple files synchronized.

### MCP-Based Skill Loading

Load skills dynamically via Model Context Protocol servers.

- Rejected: MCP support is not universal across target agents. File-based loading works everywhere.

## Related

- ADR-002: (future) Service Template Structure
- ADR-003: (future) Testing Strategy
