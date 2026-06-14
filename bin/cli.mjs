#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILLS_DIR = join(ROOT, "skills");

const SKILL_TEMPLATE = `# {{name}}

## Purpose

{{purpose}}

## When to Use

{{when}}

## Best Practices

- 

## Anti-Patterns

- 

## Examples

\`\`\`java
// 
\`\`\`

## Application Checklist

- [ ] 
`;

const CATEGORIES = {
  api: "Designing API contracts and versioning",
  architecture: "Designing service structure",
  caching: "Configuring and using caches",
  cicd: "Configuring CI/CD",
  deployment: "Deploying services",
  documentation: "Generating docs",
  git: "Managing version control",
  java: "Writing Java code",
  messaging: "Working with events and message brokers",
  modernization: "Upgrading dependencies",
  observability: "Adding monitoring",
  persistence: "Working with databases",
  resilience: "Adding circuit breakers, retries, and bulkheads",
  security: "Implementing security",
  spring: "Using Spring Boot features",
  testing: "Writing tests",
  validation: "Validating request data",
};

const COMMANDS = {
  "add-skill": cmdAddSkill,
  "list-skills": cmdListSkills,
  "list-categories": cmdListCategories,
  help: cmdHelp,
};

const usage = `spring-boot-platform-agents — AI engineering platform for Spring Boot

Usage:
  sbp-agents add-skill <category> <name> [--purpose "..."]
  sbp-agents list-skills [<category>]
  sbp-agents list-categories
  sbp-agents help

Examples:
  sbp-agents add-skill messaging rabbitmq --purpose "RabbitMQ integration patterns"
  sbp-agents list-skills persistence
  sbp-agents list-categories
`;

function cmdHelp() {
  console.log(usage);
}

function cmdListCategories() {
  console.log("Available skill categories:\n");
  for (const [dir, description] of Object.entries(CATEGORIES)) {
    const count = existsSync(join(SKILLS_DIR, dir))
      ? readdirSync(join(SKILLS_DIR, dir)).filter((f) => f.endsWith(".md")).length
      : 0;
    console.log(`  ${dir.padEnd(16)} ${description} (${count} skills)`);
  }
}

function cmdListSkills(category) {
  if (category && !CATEGORIES[category]) {
    console.error(`Unknown category: ${category}`);
    console.log(`Run 'sbp-agents list-categories' to see available categories.`);
    process.exit(1);
  }

  const dirs = category ? [category] : Object.keys(CATEGORIES);
  console.log("Available skills:\n");

  for (const dir of dirs) {
    const dirPath = join(SKILLS_DIR, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath)
      .filter((f) => f.endsWith(".md"))
      .sort();

    if (files.length === 0) continue;

    console.log(`  ${dir}/`);
    for (const file of files) {
      const name = file.replace(/\.md$/, "");
      console.log(`    ├── ${name}`);
    }
    console.log();
  }
}

function cmdAddSkill(category, name, purpose) {
  if (!category || !name) {
    console.error("Usage: sbp-agents add-skill <category> <name> [--purpose \"...\"]");
    process.exit(1);
  }

  if (!CATEGORIES[category]) {
    console.error(`Unknown category: ${category}`);
    console.log(`Run 'sbp-agents list-categories' to see available categories.`);
    process.exit(1);
  }

  const fileName = name.toLowerCase().replace(/\s+/g, "-") + ".md";
  const dirPath = join(SKILLS_DIR, category);
  const filePath = join(dirPath, fileName);

  if (existsSync(filePath)) {
    console.error(`Skill already exists: ${category}/${fileName}`);
    process.exit(1);
  }

  mkdirSync(dirPath, { recursive: true });

  const content = SKILL_TEMPLATE
    .replace(/{{name}}/g, name)
    .replace(/{{purpose}}/g, purpose || `Guide for ${name} in Spring Boot services`)
    .replace(/{{when}}/g, purpose
      ? `- ${purpose}`
      : `- Adding ${name} support to a service`);

  writeFileSync(filePath, content, "utf-8");

  console.log(`Created: skills/${category}/${fileName}`);
  console.log();
  console.log("Next steps:");
  console.log(`  1. Edit skills/${category}/${fileName} with best practices, anti-patterns, and examples`);
  console.log(`  2. Register the skill in AGENTS.md if it needs a new category`);
  console.log(`  3. Reference the skill in applicable playbooks`);
}

// --- Parse arguments ---
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "help" || command === "--help") {
  cmdHelp();
  process.exit(0);
}

if (!COMMANDS[command]) {
  console.error(`Unknown command: ${command}`);
  console.log(usage);
  process.exit(1);
}

// Extract --purpose flag
const purposeIdx = args.indexOf("--purpose");
let purpose = undefined;
if (purposeIdx !== -1 && args[purposeIdx + 1]) {
  purpose = args[purposeIdx + 1];
  args.splice(purposeIdx, 2);
}

const rest = args.slice(1);

if (command === "add-skill") {
  cmdAddSkill(rest[0], rest[1], purpose);
} else if (command === "list-skills") {
  cmdListSkills(rest[0]);
} else {
  cmdListCategories();
}
