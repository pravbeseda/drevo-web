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
5. After the review, create a todo list with actionable tasks based on findings
6. **All review results must be in Russian**
