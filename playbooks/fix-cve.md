# Fix CVE Playbook

Required Agents:
- security-engineer
- release-engineer

Required Skills:
- java25-modern
- conventional-commits
- openrewrite
- github-actions (or gitlab-ci or jenkins)

Workflow:

1. **Identify CVE** — GHSA advisory, Dependabot alert, Snyk report, Trivy scan, or `mvn dependency-check:check` output.
2. **Assess severity**:
   - CRITICAL (CVSS 9.0-10.0): Emergency fix. Create hotfix branch. Fix within 24 hours.
   - HIGH (CVSS 7.0-8.9): Priority fix. Fix within 72 hours.
   - MEDIUM (CVSS 4.0-6.9): Schedule in next sprint.
   - LOW (CVSS 0.1-3.9): Track for next release.
3. **Determine fix path**:
   - Upgrade dependency — `mvn versions:use-latest-releases` or OpenRewrite recipe.
   - Exclude vulnerable transitive dep — add `<exclusion>` in POM.
   - Override version with `<properties>` or `<dependencyManagement>`.
   - If no patch available: add WAF rule, disable vulnerable endpoint, or add runtime protections.
4. **Apply fix**:
   ```bash
   # Upgrade specific dependency
   mvn versions:update-properties -DincludeProperties=some.library.version
   # Or use OpenRewrite
   mvn rewrite:run -DactiveRecipes=org.openrewrite.java.dependencies.UpgradeDependency
   ```
5. **Verify**:
   - `mvn dependency-check:check` passes (or Trivy, or Snyk)
   - Integration tests pass
   - No regression in affected functionality
   - OpenAPI spec updated if API behavior changed
6. **Document** — Update ADR if fix involved breaking change or workaround. Record CVE ID in release notes.
7. **Release** — Create fix commit with message format: `fix: resolve CVE-2024-XXXX in dependency-X.Y.Z`. For CRITICAL/HIGH, create a patch release.

Output:
- CVE remediation summary (CVE ID, severity, fixed version, verification method)
- If unpatched: risk acceptance rationale and compensating controls
- Release tag
