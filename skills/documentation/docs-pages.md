# Docs Pages (GitHub / GitLab)

## Purpose

Deploy API documentation and service documentation as static websites using GitHub Pages or GitLab Pages, automatically updated on every merge to main.

## When to Use

- All services must publish their documentation as a browsable static site.
- Required by the generate-docs playbook as the final delivery step.
- Use GitHub Pages when using GitHub; GitLab Pages when using GitLab.

## Best Practices

### GitHub Pages

Deploy generated HTML docs from a GitHub Actions workflow:

```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 25
          distribution: temurin
          cache: maven
      - run: mvn prepare-package -B
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./target/classes/static/docs
          publish_branch: gh-pages
```

Configuration:
- Go to repository Settings → Pages → Source: "Deploy from a branch" → branch: `gh-pages`, folder: `/ (root)`.
- Site will be available at `https://<org>.github.io/<repository>/`.

For user/organization site (`<org>.github.io`):
- Use the `<org>.github.io` repository.
- Push generated docs to the `main` branch (not `gh-pages`).

### GitLab Pages

Deploy generated HTML docs using a GitLab CI job:

```yaml
# .gitlab-ci.yml (in the same pipeline as build+test)
pages:
  stage: deploy
  script:
    - mvn prepare-package -B -q
    - cp -r target/classes/static/docs public/
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  environment:
    name: pages
    url: $CI_PAGES_URL
```

Configuration:
- No additional GitLab Pages configuration needed — the `pages` job with `public/` artifacts is detected automatically.
- Disable "Use unique domain" in Settings → Pages for a cleaner URL.
- Site will be available at `https://<group>.gitlab.io/<project>/`.

### Antora for Multi-Service Documentation

For platforms with multiple services, use Antora to compose a unified documentation site:

```yaml
# playbook.yml
site:
  title: Spring Boot Platform Documentation
  url: https://docs.example.com
content:
  sources:
    - url: https://github.com/org/customer-service
      branches: main
      start_path: docs
    - url: https://github.com/org/order-service
      branches: main
      start_path: docs
ui:
  bundle:
    url: https://gitlab.com/antora/antora-ui-default/-/jobs/artifacts/HEAD/raw/build/ui-bundle.zip
output:
  dir: ./public
```

```yaml
# .gitlab-ci.yml for Antora playbook repository
pages:
  image: antora/antora:latest
  stage: deploy
  script:
    - antora --fetch --redirect-facility gitlab --to-dir public antora-playbook.yml
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

### Custom Domains and Redirects

**GitHub Pages:**
- Create a `CNAME` file in the `gh-pages` branch root with `docs.example.com`
- Configure DNS: CNAME record pointing to `<org>.github.io`

**GitLab Pages:**
- Settings → Pages → Domains → Add custom domain
- Verify domain ownership via DNS TXT record
- Configure SSL/TLS (GitLab provides automated Let's Encrypt certificates)

**Redirects (GitLab Pages):**
Create a `public/_redirects` file:
```
/docs / 301
/api/v1 /api/v2 302
```

## Anti-Patterns

- Committing generated HTML to the source branch — generate at build time and deploy to a separate branch (`gh-pages`) or artifact.
- No CI/CD integration — manually rebuilding docs means they go stale. Automate deployment on every merge.
- Single service docs without navigation — for multi-service platforms, use Antora to provide cross-service search and navigation.
- Serving docs from the same application instance in production — separate docs hosting prevents documentation from consuming application resources.
- No versioned docs — for public APIs, maintain docs per major version (v1, v2) with a version selector.

## Examples

```bash
# View deployed GitHub Pages
open https://<org>.github.io/<repository>/

# View deployed GitLab Pages
open https://<group>.gitlab.io/<project>/

# Antora demo playbook
# https://gitlab.com/antora/antora-demo
```
