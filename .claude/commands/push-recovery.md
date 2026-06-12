# NPM Push Recovery & Troubleshooting

Companion to `/push`. Use this when the push script fails, versions look inconsistent, a git push was rejected mid-publish, or a dependent repo won't install. Every scenario here happened at least once in this project.

## Invariants After a Successful Push

For each published repo, all of these must hold. Check them before declaring a push done:

1. **Version published**: `npm view <pkg> version` (run in PowerShell, not Git Bash) equals `package.json` version
2. **Main pushed**: `git log origin/main..HEAD` is empty
3. **Tag pushed and reachable**: `git tag -l <ver>` exists, and `git merge-base --is-ancestor <ver> origin/main` succeeds
4. **Dependents consistent**: in each repo that depends on the published package, `package.json`, `package-lock.json`, AND `node_modules` all reference the new version — `npm ci` must work there

Quick lockfile check in a dependent repo:

```bash
node -e "const l=require('./package-lock.json'); console.log(l.packages['node_modules/@bestapps/webcomponents']?.version)"
```

## Symptom → Cause → Fix

| Symptom | Cause | Fix |
|---|---|---|
| `push-all.ps1` parse error: "string is missing the terminator" | Non-ASCII char (em-dash, smart quote) in the `.ps1`. Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI; an em-dash byte decodes to `”`, which PS treats as a string terminator | Keep `.ps1` files **pure ASCII**. Verify: byte scan for values > 127, then parse with `[System.Management.Automation.Language.Parser]::ParseFile` under `powershell.exe` (not pwsh) |
| `check-versions.sh` says "NOT LOGGED IN" or "not published" but PowerShell disagrees | npm auth tokens and sometimes registry reads are not visible inside Git Bash on Windows | Trust PowerShell. Verify with `npm whoami` / `npm view <pkg> version` in PowerShell. This is why the push script is PowerShell on Windows |
| `git push` rejected: "remote contains work that you do not have" | Remote gained commits this clone never pulled (another machine, web edits) | Scripts now fetch and **fail fast before bumping**. If it fired: pull/merge in that repo, re-run the script. If an older script already published past it, see Recovery below |
| Verification shows `[MISMATCH]` seconds after a successful publish | npm registry read lag right after publish | Wait ~10s and `npm view` again. The script retries 3× automatically — only investigate if it still mismatches after that |
| `npm ci` fails in a dependent repo | Lockfile stale or missing the `@bestapps/*` entry — propagation rewrote `package.json` without `npm install` (fixed in the scripts, but old clones may carry the damage) | `npm install` in that repo, then commit `package-lock.json` as `chore(deps): sync package-lock with <pkg>@<ver>` |
| `npm publish` hangs on auth | 2FA browser authentication | Open the printed URL, complete auth in the browser; the script continues |
| Script died mid-run | Any | **Safe to re-run.** It detects already-bumped versions (local > npm, or tag exists) and skips straight to publish without double-bumping |

## Recovery: Published to npm but Main Not Pushed

The worst state: npm has the new version, the tag is on the remote, but `main` was rejected. The published commit exists only locally and in the tag.

1. **Inspect both sides first** — never merge blind:
   ```bash
   git fetch origin
   git log --oneline origin/main..HEAD   # local-only (includes the version bump)
   git log --oneline HEAD..origin/main   # remote-only (what got pulled in elsewhere)
   ```
2. **Merge, never rebase**: `git merge origin/main --no-edit`. The pushed tag pins the exact commit npm was built from — rebasing rewrites it and orphans the tag from main's history. A merge keeps it reachable.
3. **Verify the merge kept the publish state**: `package.json` version and `@bestapps/*` dep ranges must match what was published. Auto-merge usually gets this right; check anyway.
4. `git push origin main`, then re-check all invariants above.

## Hard Rules

- **Never rebase** a branch whose version tag is already pushed
- **Never `--force` push** to main, never `--no-verify`
- **Never try to republish the same version** — npm rejects it; if a bad version went out, bump patch and publish again (don't `npm unpublish`)
- **Each repo is an independent clone** — run every git command inside the repo directory, and remember the orchestration repo itself also needs `git push` (the script only pushes `repositories/*`)

## What the Scripts Already Guard (don't re-add, don't work around)

- Fetch + fail-fast when a repo is behind `origin/main` (before any bump)
- Exit-code checks on `git push origin main`
- `npm view` retry loop in verification (registry lag)
- `npm install` + lockfile commit in dependent repos during propagation (with retries for post-publish registry lag)

If one of these aborts the script, the fix is almost always: pull/merge the named repo, then re-run — not editing the script.
