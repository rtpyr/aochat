# Decisions

Append-only, newest first. Include failed approaches so nobody repeats them.
Format: `## YYYY-MM-DD: title` then **Decision**, **Why**, **Rejected / failed**.

## 2026-11-28: Agents work on branches; merge and push after the user approves
- **Decision:** Replaces "Always push" in the old CLAUDE.md. Every change is committed on the agent's own branch; when the user says merge, it is merged into `main` and pushed immediately.
- **Why:** Several agents (Claude Code, Codex, Hermes) now work in parallel Orca worktrees, and a second agent can review before `main` changes.
- **Rejected:** Pushing straight to `main` after every change (no room for review, agents could overwrite each other); agents never pushing (changes would pile up unpushed).

## 2026-11-28: AGENTS.md is the single source of rules
- **Decision:** All rules from CLAUDE.md moved word for word into AGENTS.md; CLAUDE.md now only contains `@AGENTS.md`.
- **Why:** Codex and Hermes read AGENTS.md; Claude Code reads it through the import. One copy can't drift.
