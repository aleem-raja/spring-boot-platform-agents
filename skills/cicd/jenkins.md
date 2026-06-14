# Jenkins

## Purpose

Automate build, test, and deployment pipelines using Jenkins for Spring Boot services in enterprise environments.

## When to Use

- Enterprise environments with existing Jenkins infrastructure.
- When pipeline orchestration requires complex conditional logic, human approval gates, or multi-environment promotion.
- When compliance requirements mandate audit trails for all pipeline executions.

## Best Practices

- Use Jenkins Pipeline as Code (Jenkinsfile in repository root) — never use freestyle jobs.
- Use Declarative Pipeline for readability and structured stages.
- Use Shared Libraries for reusable pipeline logic across services.
- Use `withMaven` (Pipeline Utility Steps) for Maven build with integrated test reporting.
- Use `withDockerRegistry` for Docker image build and push.
- Use `credentials()` binding for secrets — never hardcode in Jenkinsfile.
- Use `input` step for manual approval gates before production deployment.
- Use `post` sections for cleanup, notifications, and artifact archiving.

## Anti-Patterns

- Freestyle jobs with manual configuration — not version-controlled, not reproducible.
- Monolithic Jenkinsfile with no shared library — duplicated pipeline logic across services.
- Building and testing in the same stage — split for faster feedback.
- Not cleaning up workspace after build — disk usage grows unbounded.
- Hardcoded agent labels — use `agent any` or parameterized labels.

## Examples

```groovy
pipeline {
    agent { docker { image 'maven:3.9-eclipse-temurin-25' } }
    stages {
        stage('Build') {
            steps {
                sh 'mvn compile -B -q'
            }
        }
        stage('Test') {
            steps {
                sh 'mvn verify -B'
            }
            post {
                always {
                    junit 'target/surefire-reports/TEST-*.xml'
                }
            }
        }
        stage('Security Scan') {
            steps {
                sh 'mvn org.owasp:dependency-check-maven:check -B'
            }
            post {
                always {
                    dependencyCheckPublisher pattern: 'target/dependency-check-report.xml'
                }
            }
        }
        stage('Approve Production') {
            input {
                message 'Deploy to production?'
                ok 'Deploy'
            }
        }
        stage('Deploy') {
            steps {
                sh 'echo "Deploying ${env.BUILD_TAG}"'
            }
        }
    }
    post {
        failure {
            emailext(
                subject: "Build failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                to: 'team@example.com'
            )
        }
    }
}
```
