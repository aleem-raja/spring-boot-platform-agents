# Review Pull Request Playbook

Required Agents:
- code-reviewer
- security-engineer

Required Skills:
- java25-modern
- openapi
- conventional-commits
- trunk-based-development
- api-versioning

Workflow:

1. **Load changed files** — Diff against base branch. Identify new, modified, deleted files.
2. **Check commit history** — Verify conventional commit format. Reject fixup!/squash! commits.
3. **Architecture review** — Verify hexagonal structure. No circular dependencies. Domain layer has zero framework imports.
4. **API review** — Breaking changes must bump API version. OpenAPI spec must match implementation. Deprecation headers present for old versions.
5. **Security review** — OWASP Top 10 scan. No secrets in code. No hardcoded credentials. CSRF, CORS, headers verified.
6. **Code review checklist**:
   - Records used for DTOs (not mutable POJOs)
   - Constructor injection everywhere (no @Autowired on fields)
   - Virtual threads not blocked by synchronized/pools
   - AssertJ fluent assertions in tests
   - Testcontainers for integration tests (not H2 in-memory)
   - Pattern matching in instanceof and switch
   - Sealed interfaces where hierarchy is fixed
   - No raw collections, no null returns from collections
   - @ExceptionHandler in @ControllerAdvice, not try-catch in controllers
7. **Test review** — Unit tests cover domain logic. Integration tests cover persistence and API. Tests are flake-free (@DirtiesContext only when necessary).
8. **Documentation review** — ADR updated if architecture changed. OpenAPI spec current. README updated if endpoints added/removed.
9. **Approve or request changes** — Use conventional-commits labels: feat/fix requires version bump. BREAKING CHANGE requires major version.

Output:
- Review summary with pass/fail per section
- PR labels: `needs-work`, `ready-to-merge` (with auto-merge)
- Security findings list if any
