#!/bin/bash
# Check npm versions, repo status, and dependency consistency across all repositories.
# Usage: bash scripts/check-versions.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="$ROOT_DIR/repositories"

echo "=== NPM Auth ==="
NPM_USER=$(npm whoami 2>/dev/null) || true
if [ -z "$NPM_USER" ]; then
    echo "  NOT LOGGED IN — run 'npm login' before pushing"
else
    echo "  Logged in as: $NPM_USER"
fi
echo ""

echo "=== Repositories ==="
echo ""

declare -A LOCAL_VERSIONS

for repo_dir in "$REPOS_DIR"/*/; do
    [ -f "$repo_dir/package.json" ] || continue

    repo_name=$(basename "$repo_dir")
    cd "$repo_dir"

    pkg_name=$(node -p "require('./package.json').name")
    local_ver=$(node -p "require('./package.json').version")
    npm_ver=$(npm view "$pkg_name" version 2>/dev/null || echo "not published")

    LOCAL_VERSIONS["$pkg_name"]="$local_ver"

    dirty=""
    [ -n "$(git status --porcelain 2>/dev/null)" ] && dirty=" [DIRTY]"

    ahead=0
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        ahead=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')
    fi
    ahead_str=""
    [ "$ahead" -gt 0 ] 2>/dev/null && ahead_str=" [AHEAD:$ahead]"

    ver_status="OK"
    [ "$local_ver" != "$npm_ver" ] && ver_status="DIFFERS"
    [ "$npm_ver" = "not published" ] && ver_status="UNPUBLISHED"

    int_deps=$(node -p "
        const p = require('./package.json');
        const d = Object.assign({}, p.dependencies||{}, p.devDependencies||{});
        Object.entries(d).filter(([k])=>k.startsWith('@bestapps/')).map(([k,v])=>k+'@'+v).join(', ')||'none'
    ")

    echo "  $repo_name ($pkg_name)"
    echo "    Local: $local_ver | NPM: $npm_ver [$ver_status]$dirty$ahead_str"
    echo "    Internal deps: $int_deps"

    needs_push="no"
    [ -n "$dirty" ] || [ "$ahead" -gt 0 ] 2>/dev/null && needs_push="yes"
    [ "$ver_status" = "UNPUBLISHED" ] && needs_push="yes"
    echo "    Needs push: $needs_push"
    echo ""

    cd "$ROOT_DIR"
done
