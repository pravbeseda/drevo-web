---
name: create
description: Plan, implement, and test a new feature or change with pre-implementation review
---

# Create

Plan, implement, and test a feature or change following project conventions.

## Task

$ARGUMENTS

If `$ARGUMENTS` is empty, use the task described in the preceding conversation messages.

## Workflow

### Phase 1 — Analysis

Switch to **plan mode** and perform the following analysis before writing any code.

#### 1.1 Task review

- Does the task align with **Angular-way** and project best practices (see CLAUDE.md)?
- Are there **simpler alternatives** — easier to implement, maintain, or extend, or more popular in the Angular ecosystem?
- If alternatives exist, present them to the user with trade-offs and let them choose.

#### 1.2 Codebase reuse check

- Search the project for **existing code** that can be reused (services, components, utilities, patterns).
- Identify shared logic that should be **extracted** to avoid duplication across components.

#### 1.3 Clarifications

- Ask clarifying questions at **any point** if requirements are ambiguous.
- When multiple implementation approaches exist, present options and **let the user decide** — never choose for the user.

#### 1.4 Plan self-review

Before presenting the plan to the user, verify:

- Does it fully address the task requirements?
- Does it comply with **all project conventions** (CLAUDE.md)?
- Is the plan **sufficient and complete** — no missing steps?
- Is it **not over-engineered** — no unnecessary abstractions or premature generalization?

If issues are found, fix them or ask additional questions before presenting.

### Phase 2 — Implementation

After the user approves the plan:

1. Implement the feature following the approved plan
2. Run `yarn lint` and `yarn build` — fix any issues found
3. Verify the implementation complies with project conventions (CLAUDE.md)
4. Report completion to the user

### Phase 3 — Testing

**Wait for the user to confirm** that the feature works correctly before writing tests.

After confirmation:

1. Write unit tests (Jest + Spectator) covering the new functionality
2. Run `yarn lint` and `yarn nx test <project>` — fix any issues found
3. Report test results

## Rules

- **All conversation in Russian**
- Follow all conventions from CLAUDE.md strictly
- Never skip the analysis phase — even for seemingly simple tasks
- Never write tests before user confirms the implementation works
