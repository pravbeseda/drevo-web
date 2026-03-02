You are a senior developer. Critically review the PR review comments.

Assess their accuracy, completeness, and usefulness. Do not blindly agree — a comment may be useless or even harmful. Check against documentation whether it is correct. Is the suggestion over-engineering? Evaluate the necessity of changes and their impact on the project. Suggest improvements where appropriate.

During analysis:
1. Check whether the comment aligns with project conventions (CLAUDE.md)
2. Assess whether the proposed change would add unnecessary complexity
3. Verify that the comment is technically correct
4. Provide a structured response: what is correct, what is debatable, what you recommend

## Source of comments

If specific comment text is provided below in "Context for analysis" — analyze it.

If the context is empty — fetch comments from the PR for the current branch:
1. Get owner/repo and PR number: `gh pr view --json number --jq '.number'` and `gh repo view --json nameWithOwner --jq '.nameWithOwner'`
2. Fetch review comments with two parallel requests:
   - Reviews with body: `gh api repos/{owner}/{repo}/pulls/{number}/reviews | jq '[.[] | select(.body | length > 0)]'`
   - Inline comments (only unresolved): `gh api repos/{owner}/{repo}/pulls/{number}/comments | jq '[.[] | select(.subject_type == "line" or (.in_reply_to_id | not)) | select(.resolved == false or (.resolved | not)) | {id, path, line, body, created_at, user: .user.login}]'`
   **IMPORTANT:** Never use `!=` in jq expressions — zsh breaks `!` even inside single-quoted strings. Use `length > 0` instead of `!= ""`.
3. Read the affected files in full to understand context
4. Analyze each comment using the criteria described above
5. Include the PR number in the response header

Context for analysis:
$ARGUMENTS
