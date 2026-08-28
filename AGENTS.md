# Agent Rules & Guidelines (BossParty)

## 1. Git Commit & Pre-Commit TypeScript Validation (Strict Mandatory Rule)
- **Mandatory Pre-Commit Check**: Before executing ANY `git commit` command, the agent MUST proactively run `npx tsc --noEmit` (or `npm run typecheck`) to verify that there are zero TypeScript compilation errors, type mismatches, or unused variable warnings.
- **No Fragmented Fix Commits**: Never commit code that has not passed type checking first. If any errors or warnings are found during `tsc`, they MUST be fixed in the working tree BEFORE committing. Do not pollute the git commit history with separate "fix TS error", "fix import", or "fix type" follow-up commits.
- **Atomic, Clean & Meaningful Commits**: Every commit in the repository must be a verified, fully compiling, self-contained unit of work with a clear descriptive message.

## 2. Code Quality & Encoding Standards
- Maintain strict UTF-8 file encoding without byte corruption.
- Follow the React component best practices and MapleStory parchment design system standards.
