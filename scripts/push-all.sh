#!/bin/bash
# Orchestrate npm publishing across all repositories in dependency order.
# Handles already-bumped versions, npm 2FA retry, and dependency propagation.
#
# Usage: bash scripts/push-all.sh
#
# Pre-requisite: commit code changes before running (the /push skill does this).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="$ROOT_DIR/repositories"

npm_publish_with_retry() {
    npm publish --access=public
    if [ $? -ne 0 ]; then
        echo ""
        echo "npm publish failed — likely needs 2FA browser authentication."
        echo "Open the URL above in your browser and complete authentication."
        read -p "Press Enter after authenticating... "
        npm publish --access=public
        if [ $? -ne 0 ]; then
            echo "ERROR: npm publish still failed."
            return 1
        fi
    fi
    return 0
}

# --- Auth check ---
NPM_USER=$(npm whoami 2>/dev/null) || true
if [ -z "$NPM_USER" ]; then
    echo "ERROR: Not logged in to npm. Run 'npm login' first."
    exit 1
fi
echo "Logged in as: $NPM_USER"
echo ""

# --- Build dependency order ---
declare -a BASE_REPOS=()
declare -a DEP_REPOS=()

for repo_dir in "$REPOS_DIR"/*/; do
    [ -f "$repo_dir/package.json" ] || continue
    repo_name=$(basename "$repo_dir")
    has_internal=$(cd "$repo_dir" && node -p "
        const p=require('./package.json');
        const d={...(p.dependencies||{}), ...(p.devDependencies||{})};
        Object.keys(d).some(k=>k.startsWith('@bestapps/'))
    ")
    if [ "$has_internal" = "true" ]; then
        DEP_REPOS+=("$repo_name")
    else
        BASE_REPOS+=("$repo_name")
    fi
done
ALL_REPOS=("${BASE_REPOS[@]}" "${DEP_REPOS[@]}")

echo "Push order: ${ALL_REPOS[*]}"
echo ""

# --- Push loop ---
PUSHED=0
for repo_name in "${ALL_REPOS[@]}"; do
    repo_dir="$REPOS_DIR/$repo_name"
    cd "$repo_dir"

    pkg_name=$(node -p "require('./package.json').name")
    local_ver=$(node -p "require('./package.json').version")
    npm_ver=$(npm view "$pkg_name" version 2>/dev/null || echo "")

    # Skip if fully up to date
    dirty=$(git status --porcelain 2>/dev/null | head -1)
    ahead=0
    git rev-parse --verify origin/main >/dev/null 2>&1 && \
        ahead=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')

    if [ -z "$dirty" ] && [ "$ahead" -eq 0 ] 2>/dev/null && [ "$local_ver" = "$npm_ver" ]; then
        echo "--- $repo_name: fully up to date, skipping ---"
        echo ""
        continue
    fi

    # Fail fast if the remote has commits we don't have — otherwise the
    # version-bump commit gets published to npm but main is unpushable
    git fetch origin >/dev/null 2>&1
    behind=$(git log --oneline HEAD..origin/main 2>/dev/null | wc -l | tr -d ' ')
    if [ "$behind" -gt 0 ] 2>/dev/null; then
        echo "ERROR: $repo_name is behind origin/main ($behind commit(s))."
        echo "Pull/merge in $repo_dir first, then re-run this script."
        exit 1
    fi

    echo "========================================"
    echo "  $repo_name ($pkg_name)"
    echo "  Local: $local_ver | NPM: ${npm_ver:-not published}"
    echo "========================================"

    # Check if version was already bumped past npm (e.g. push.sh ran but npm publish failed)
    already_bumped="false"
    if [ -n "$npm_ver" ]; then
        already_bumped=$(node -p "
            const [lM,lm,lp]='$local_ver'.split('.').map(Number);
            const [nM,nm,np]='$npm_ver'.split('.').map(Number);
            lM>nM||(lM===nM&&lm>nm)||(lM===nM&&lm===nm&&lp>np)
        ")
    elif git tag -l "$local_ver" | grep -q .; then
        # Tag exists but never published — version was bumped, npm publish failed
        already_bumped="true"
    fi

    if [ "$already_bumped" = "true" ]; then
        # Version already bumped — just build and publish (don't re-bump)
        echo "Version already bumped to $local_ver. Building and publishing..."
        npm run build
        npm_publish_with_retry || exit 1
    else
        # Normal flow: run push.sh (bump + build + git + publish)
        old_ver="$local_ver"
        bash push.sh
        rc=$?
        if [ $rc -ne 0 ]; then
            new_ver=$(node -p "require('./package.json').version")
            if [ "$new_ver" != "$old_ver" ]; then
                # push.sh bumped version and pushed git, but npm publish failed
                echo ""
                echo "Version bumped to $new_ver but npm publish failed."
                npm_publish_with_retry || exit 1
            else
                echo "ERROR: push.sh failed for $repo_name"
                exit 1
            fi
        fi
    fi

    new_ver=$(node -p "require('./package.json').version")
    echo ""
    echo "Published $pkg_name@$new_ver"
    echo ""
    PUSHED=$((PUSHED + 1))

    # --- Propagate version to dependents ---
    for other_dir in "$REPOS_DIR"/*/; do
        [ -f "$other_dir/package.json" ] || continue
        other_name=$(basename "$other_dir")
        [ "$other_name" = "$repo_name" ] && continue

        has_dep=$(cd "$other_dir" && node -p "
            const p=require('./package.json');
            const d={...(p.dependencies||{}), ...(p.devDependencies||{})};
            '$pkg_name' in d
        ")

        if [ "$has_dep" = "true" ]; then
            cd "$other_dir"
            current_dep_ver=$(node -p "
                const p=require('./package.json');
                (p.dependencies?.['$pkg_name'])||(p.devDependencies?.['$pkg_name'])||''
            ")
            target_dep_ver="^$new_ver"

            if [ "$current_dep_ver" = "$target_dep_ver" ]; then
                echo "$other_name already has $pkg_name@$target_dep_ver"
            else
                echo "Updating $pkg_name to $target_dep_ver in $other_name/package.json"
                node -e "
                    const fs=require('fs');
                    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
                    if(pkg.dependencies?.['$pkg_name']) pkg.dependencies['$pkg_name']='$target_dep_ver';
                    if(pkg.devDependencies?.['$pkg_name']) pkg.devDependencies['$pkg_name']='$target_dep_ver';
                    fs.writeFileSync('package.json', JSON.stringify(pkg,null,2)+'\n');
                "
                # refresh lockfile + node_modules so npm ci keeps working;
                # retry because the registry can lag right after publish
                installed=0
                for attempt in 1 2 3; do
                    if npm install --no-audit --no-fund; then installed=1; break; fi
                    sleep 10
                done
                if [ "$installed" -ne 1 ]; then
                    echo "ERROR: npm install failed in $other_name"
                    exit 1
                fi
                git add package.json
                [ -f package-lock.json ] && git add package-lock.json
                git commit -m "chore(deps): update $pkg_name to $new_ver"
            fi
            echo ""
        fi
    done

    cd "$ROOT_DIR"
done

if [ "$PUSHED" -eq 0 ]; then
    echo "Nothing to push — all repos are up to date."
else
    echo ""
    echo "=== Verification ==="
    bash "$ROOT_DIR/scripts/check-versions.sh"
    echo "=== Done: $PUSHED repo(s) pushed ==="
fi
