---
name: review-branch
description: Review current branch changes against standalone branch
---

# Review Branch

Review all changes on the current branch compared to `standalone`.

## Context

**Current branch:** !`git rev-parse --abbrev-ref HEAD`

**Changed files:**
!`git diff standalone...HEAD --name-status`

**Diff:**
!`git diff standalone...HEAD`

## Instructions

1. Read each changed file **in full** (not just the diff) to understand the surrounding context
2. Summarize the scope of changes — what was added, modified, removed
3. Review and report findings, categorized by severity:
   - **Critical** — bugs, security issues, data loss risks
   - **Warning** — missed edge cases, missing tests, convention violations (see CLAUDE.md)
   - **Suggestion** — code duplication, possible simplifications, other improvements
4. Reference specific files and lines in every finding (`file_path:line_number`)
5. After the review, proceed to fix findings interactively:
   - Sort by severity (critical → warning → suggestion), group logically related items together
   - For each group, describe the problem and proposed fix, then ask the user for approval before applying
   - If multiple solutions exist, present options and let the user choose
   - If the user asks a question instead of choosing an option, answer the question and re-present the options — never decide for the user
   - Wait for user confirmation before moving to the next group
6. **All review results and conversation must be in Russian**
