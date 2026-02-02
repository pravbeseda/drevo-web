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

1. Summarize the scope of changes — what was added, modified, removed
2. Review code quality against project conventions (see CLAUDE.md)
3. Flag potential bugs, security issues, or missed edge cases
4. Note missing tests if applicable
5. Suggest improvements if any
