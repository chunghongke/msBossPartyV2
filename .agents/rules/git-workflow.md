---
description: Enforce pre-commit TypeScript verification and clean atomic git commit history
always_on: true
---

# Pre-Commit TypeScript Check & Git Workflow Rule

Whenever you are about to make a commit:
1. **Always Verify First**: Run `npx tsc --noEmit` before executing `git commit`.
2. **Resolve in Place**: If there are any TypeScript compilation errors or linter warnings, fix them immediately in the source files before staging/committing.
3. **Zero Fix-Up Commits**: Do not commit unverified code followed by immediate "fix type error" commits. All commits must be clean, passing, and atomic.
