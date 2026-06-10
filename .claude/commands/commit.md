# Commit Convention

Rules for creating git commits in this project. Follow these whenever the user asks to commit or push changes.

## Multi-Repo Awareness

This is an orchestration project. The `repositories/` directory contains independent git repos (each is a standalone clone, NOT submodules). When committing:

1. **Always check all repos for changes** — run `git status` and `git diff` in the orchestration root AND in each directory under `repositories/` (cd into each directory to run git commands)
2. **Report what changed where** — before committing, summarize which repos have changes so the user sees the full picture
3. **Commit each repo independently** — each repo gets its own commit with a message appropriate to its changes
4. **Respect user scope** — if the user says "commit this repo" or names a specific repo, only commit there. If unspecified, commit all repos that have changes
5. **Order matters** — when changes span repos (e.g. a dependency was renamed), commit the dependency first, then the dependent

## When to Commit

- Commit **after** a coherent unit of work is complete — a fix, a feature, a refactor, a test suite
- Never commit mid-implementation or with half-finished code
- If a task has multiple independent parts (e.g. a fix + new tests for it), prefer one commit that includes both — unless the user explicitly asks for separate commits
- Run tests before committing. If tests fail, fix first, then commit

## Commit Message Format

```
type(scope): short description

Optional longer explanation if the change is non-obvious.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Type Prefixes (required)

| Prefix | When to use |
|---|---|
| `fix` | Bug fix — something was broken, now it works |
| `feat` | New feature or capability that didn't exist before |
| `refactor` | Code restructuring without changing behavior |
| `test` | Adding or updating tests only (no production code changes) |
| `docs` | Documentation-only changes (skills, CLAUDE.md, comments) |
| `chore` | Build config, dependencies, tooling, CI — no production logic |
| `style` | Formatting, whitespace, semicolons — no logic change |
| `perf` | Performance improvement without changing behavior |

### Scope (required)

The component or area affected, in parentheses. Use kebab-case. Examples from this project:

- `fix(apl):` — APL orchestrator or cross-cutting APL change
- `fix(apl-inspector):` — inspector-related fix
- `feat(apl-factory):` — new factory capability
- `test(apl-drag-drop):` — drag-drop test suite
- `refactor(apl-dom):` — APLDom restructuring
- `docs(overview):` — project overview skill update
- `chore(deps):` — dependency updates

If a change spans multiple components, use the most significant one or the orchestrating layer (e.g. `apl`).

### Description (required)

- Lowercase, no period at end
- Imperative mood: "add", "fix", "remove", "change" — not "added", "fixes", "removed"
- Focus on **what changed and why**, not how
- Keep under 72 characters

### Good examples

```
fix(apl-inspector): clone vendor link tag into shadow DOM for file:// support
feat(apl-factory): add component cloning with data preservation
refactor(apl): remove global coupling — inject deps via setters and CustomEvent
test(apl-drag-drop): add E2E tests for inspector tree drag-drop
chore(deps): add WebDriverIO and test infrastructure
```

### Bad examples

```
update code                          # no type, no scope, vague
fix: fixed the bug                   # no scope, past tense, vague
feat(apl): changes                   # meaningless description
Fix(APL): Add new feature.           # wrong case, period, type/description mismatch
```

## Multi-line Messages

Use a HEREDOC for multi-line commit messages to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): short description

Longer explanation of what changed and why, if the short
description isn't enough. Wrap at 72 characters.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Co-Author Line

Always include at the end of the commit message:

```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## What NOT to Do

- Never commit files that contain secrets (`.env`, credentials, API keys)
- Never use `--no-verify` to skip hooks
- Never amend a previous commit unless the user explicitly asks
- Never `git push --force` to main
- Never commit `node_modules/`, build artifacts, or IDE config (`.idea/`)
- Never create empty commits
