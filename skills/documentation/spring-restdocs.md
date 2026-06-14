# Spring REST Docs

## Purpose

Produce accurate, test-driven API documentation by combining hand-written AsciiDoc with auto-generated request/response snippets captured during Spring MVC Test runs. Documentation that is wrong causes a test failure — it cannot go stale.

## When to Use

- Preferred over annotation-based OpenAPI generation for user-facing API documentation that needs narrative explanation, examples, and use-case guidance.
- Use alongside SpringDoc for machine-readable OpenAPI specs — REST Docs for humans, SpringDoc for machines.
- Required for any service where API documentation accuracy is critical (public APIs, partner integrations).

## Best Practices

### Test-Driven Documentation

Each API endpoint test also generates documentation snippets:

```java
@SpringBootTest
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
class CustomerApiDocumentation {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateCustomer() throws Exception {
        var request = """
            {
                "email": "test@example.com",
                "name": "Test User"
            }
            """;

        mockMvc.perform(post("/api/v1/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isCreated())
            .andDo(document("customers/create",
                requestFields(
                    fieldWithPath("email").description("Customer email address"),
                    fieldWithPath("name").description("Customer full name")
                ),
                responseFields(
                    fieldWithPath("id").description("Generated customer UUID"),
                    fieldWithPath("email").description("Customer email address"),
                    fieldWithPath("createdAt").description("ISO-8601 timestamp")
                )
            ));
    }
}
```

### AsciiDoc Integration

Create `src/main/asciidoc/index.adoc` that includes the generated snippets:

```asciidoc
= Customer Service API
:toc: left
:source-highlighter: highlightjs

== Create Customer

A customer represents an individual or organization that interacts with the platform.

=== Request

==== HTTP Request
include::{snippets}/customers/create/http-request.adoc[]

==== Request Fields
include::{snippets}/customers/create/request-fields.adoc[]

=== Response

==== HTTP Response
include::{snippets}/customers/create/http-response.adoc[]

==== Response Fields
include::{snippets}/customers/create/response-fields.adoc[]
```

### Build Integration

**Maven:**
```xml
<plugin>
    <groupId>org.asciidoctor</groupId>
    <artifactId>asciidoctor-maven-plugin</artifactId>
    <executions>
        <execution>
            <id>generate-docs</id>
            <phase>prepare-package</phase>
            <goals>
                <goal>process-asciidoc</goal>
            </goals>
            <configuration>
                <sourceDirectory>src/main/asciidoc</sourceDirectory>
                <outputDirectory>${project.build.outputDirectory}/static/docs</outputDirectory>
                <attributes>
                    <snippets>${project.build.directory}/generated-snippets</snippets>
                </attributes>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Serve Docs from Spring Boot

Copy generated docs to `/static/docs` so they are served by the application itself:

```java
@Controller
@RequestMapping("/docs")
public class DocumentationController {
    @GetMapping
    public String index() {
        return "redirect:/docs/index.html";
    }
}

// Generated HTML is copied to target/classes/static/docs/
```

This gives each environment its own docs matching its deployed version — QA sees QA docs, production sees production docs.

## Anti-Patterns

- Using REST Docs for internal implementation documentation — REST Docs documents the API contract, not the implementation.
- Skipping field descriptions — auto-generated snippets with empty descriptions are not documentation.
- Not including error response snippets — document 400, 401, 403, 404, 500 responses.
- Only generating snippets without hand-written narrative — the narrative explains the API in context; snippets alone are not documentation.
- Committing generated HTML to version control — generate at build time from snippets. Only commit the `.adoc` source files.

## Examples

```bash
# Generate documentation
mvn prepare-package

# View docs (served by Spring Boot)
open http://localhost:8080/docs/index.html

# Full project example:
# https://github.com/spring-projects/spring-restdocs (official)
```
