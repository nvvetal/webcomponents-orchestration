# NPM Push

Orchestrates npm publishing across the multi-repo setup. Claude handles pre-flight checks and code commits; the push script handles the interactive push (version bump, build, npm publish, dependency propagation).

## Arguments

- No args → push all repos that have changes
- `--check` → only run version check, don't push

## Workflow

### 1. Pre-flight

Run the version check script and show results:

```bash
bash scripts/check-versions.sh
```

If npm auth fails, tell the user to run `! npm login` and stop.

If `--check` was passed, stop here.

### 2. Commit Code Changes

For each repo under `repositories/` that has uncommitted changes:

1. `cd` into the repo directory
2. Run `git status` and `git diff`
3. Stage relevant files (never `node_modules/`, `dist/`, `.idea/`)
4. Commit following the `/commit` convention:
   - Format: `type(scope): description`
   - Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
   - Commit inside the repo's own git context (each repo is an independent git clone)

Commit in dependency order: repos with no `@bestapps/*` deps first.

### 3. Hand Off to Interactive Script

After all code changes are committed, tell the user to run the appropriate script for their OS:

- **Windows:** `! powershell scripts/push-all.ps1`
- **macOS/Linux:** `! bash scripts/push-all.sh`

Detect the platform from the environment (`win32` → PowerShell, otherwise → bash).

The script handles everything:
- Checks npm auth
- Detects which repos need pushing
- Pushes in dependency order (base repos first)
- Detects already-bumped versions (just publishes, won't double-bump)
- Bumps patch version, builds, git commit/push/tag, npm publish
- Propagates dependency versions to dependent repos and commits the updates
- Runs verification at the end

### 4. Verify

After the script completes, confirm the results look correct. If any issues, help debug.

## What the Script Handles (don't duplicate)

- Version bumping
- Building (`npm run build`)
- Git operations (add, commit, push, tag)
- npm publish
- Updating `@bestapps/*` dependency versions in dependent repos
- Committing dependency version updates (uses `chore(deps): update <pkg> to <ver>`)
- Final verification

## Error Handling

| Error | Action |
|---|---|
| npm not logged in | Tell user to run `! npm login`, stop |
| Script fails mid-push | Safe to re-run — detects already-bumped versions |
| npm publish needs 2FA | Browser auth prompt opens automatically — user completes in browser |

For anything beyond these (rejected git push, version mismatches, broken lockfiles in dependents, script parse errors), use the `/push-recovery` skill.

## Important

- On Windows use `powershell scripts/push-all.ps1` (npm auth tokens not visible in Git Bash)
- On macOS/Linux use `bash scripts/push-all.sh`
- Never `--force` push or `--no-verify`
- Each repo is an independent git clone — run git commands inside the repo directory
- Follow the `/commit` convention for all code commits (type, scope, co-author)
- The script's dep-update commits use simple `chore(deps):` format — that's fine
