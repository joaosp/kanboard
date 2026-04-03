#!/usr/bin/env bash
set -e
echo "Running AI code review..."
claude --agent review --print \
  "Review the changes about to be pushed.
   Run git diff @{push}.. to see the diff.
   Read all changed files for full context.
   Focus on: bugs, security issues, convention violations,
   missing tests, and error handling gaps.
   Output a structured review as markdown.
   If you find critical issues, end with: BLOCKING: <summary>" \
| tee /tmp/ai-review-output.md

if grep -q "^BLOCKING:" /tmp/ai-review-output.md; then
  echo "AI review found blocking issues. Fix them before pushing."
  exit 1
fi

echo "Running AI security scan..."
claude --agent security --print \
  "Perform a security audit on the changes about to be pushed.
   Run git diff @{push}.. to see the diff.
   Check for: input validation, SQL injection, auth gaps, secrets, XSS, IDOR.
   If critical: end with BLOCKING: <summary>" \
| tee /tmp/ai-security-output.md

if grep -q "^BLOCKING:" /tmp/ai-security-output.md; then
  echo "Security scan found blocking issues."
  exit 1
fi
echo "AI review and security scan passed."
