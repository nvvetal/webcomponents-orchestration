# Orchestrate npm publishing across all repositories in dependency order.
# Usage: powershell scripts/push-all.ps1

$ROOT_DIR = Split-Path -Parent $PSScriptRoot
$REPOS_DIR = Join-Path $ROOT_DIR "repositories"

# --- Auth check ---
$NPM_USER = npm whoami 2>$null
if (-not $NPM_USER) {
    Write-Host "ERROR: Not logged in to npm. Run 'npm login' first." -ForegroundColor Red
    exit 1
}
Write-Host "Logged in as: $NPM_USER`n" -ForegroundColor Green

# --- Build dependency order ---
$baseRepos = @()
$depRepos = @()

foreach ($dir in Get-ChildItem -Path $REPOS_DIR -Directory) {
    $pkgPath = Join-Path $dir.FullName "package.json"
    if (-not (Test-Path $pkgPath)) { continue }
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $deps = @()
    if ($pkg.dependencies) { $deps += $pkg.dependencies.PSObject.Properties.Name }
    if ($pkg.devDependencies) { $deps += $pkg.devDependencies.PSObject.Properties.Name }
    if ($deps | Where-Object { $_ -like "@bestapps/*" }) {
        $depRepos += $dir.Name
    } else {
        $baseRepos += $dir.Name
    }
}

$allRepos = $baseRepos + $depRepos
Write-Host "Push order: $($allRepos -join ' -> ')`n"

# --- Push loop ---
$pushed = 0

foreach ($repoName in $allRepos) {
    $repoPath = Join-Path $REPOS_DIR $repoName
    Push-Location $repoPath

    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $pkgName = $pkg.name
    $localVer = $pkg.version

    $npmVer = npm view $pkgName version 2>$null
    if (-not $npmVer) { $npmVer = "not published" }

    # Check if needs pushing
    $dirty = git status --porcelain 2>$null
    $ahead = 0
    $hasRemote = git rev-parse --verify origin/main 2>$null
    if ($hasRemote) {
        $log = git log --oneline origin/main..HEAD 2>$null
        if ($log) { $ahead = @($log).Count }
    }
    $tagExists = git tag -l $localVer 2>$null

    # commits since the published version's tag = unreleased work
    $sinceTag = 0
    if ($tagExists) {
        $sinceTag = [int](git rev-list "$localVer..HEAD" --count 2>$null)
    }

    if (-not $dirty -and $ahead -eq 0 -and $localVer -eq $npmVer -and $sinceTag -eq 0) {
        Write-Host "--- $repoName : up to date, skipping ---`n" -ForegroundColor DarkGray
        Pop-Location
        continue
    }

    # Fail fast if the remote has commits we don't have - otherwise the
    # version-bump commit gets published to npm but main is unpushable
    git fetch origin 2>$null | Out-Null
    $behind = git log --oneline HEAD..origin/main 2>$null
    if ($behind) {
        Write-Host "ERROR: $repoName is behind origin/main ($(@($behind).Count) commit(s))." -ForegroundColor Red
        Write-Host "Pull/merge in $repoPath first, then re-run this script." -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $repoName ($pkgName)" -ForegroundColor Cyan
    Write-Host "  Local: $localVer | NPM: $npmVer" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Already bumped? (local > npm, or tag exists for unpublished package)
    $alreadyBumped = $false
    if ($npmVer -ne "not published") {
        $l = $localVer.Split('.') | ForEach-Object { [int]$_ }
        $n = $npmVer.Split('.') | ForEach-Object { [int]$_ }
        if ($l[0] -gt $n[0] -or
            ($l[0] -eq $n[0] -and $l[1] -gt $n[1]) -or
            ($l[0] -eq $n[0] -and $l[1] -eq $n[1] -and $l[2] -gt $n[2])) {
            $alreadyBumped = $true
        }
    } elseif ($tagExists) {
        $alreadyBumped = $true
    }

    if ($alreadyBumped) {
        # Version already bumped - just build and publish
        Write-Host "Version $localVer already bumped. Building and publishing..."
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: build failed" -ForegroundColor Red; Pop-Location; exit 1 }

        # Git commit + push if there are changes (build artifacts, etc.)
        $changes = git status --porcelain 2>$null
        if ($changes) {
            git add -A
            git commit -m "$localVer"
        }
        $aheadNow = git log --oneline origin/main..HEAD 2>$null
        if ($aheadNow) {
            git push origin main
            if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: git push failed" -ForegroundColor Red; Pop-Location; exit 1 }
        }
        if (-not $tagExists) {
            git tag $localVer
            git push origin $localVer
        }

        npm publish --access=public
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm publish failed" -ForegroundColor Red; Pop-Location; exit 1 }
    } else {
        # Full push: bump version, build, git, publish
        $parts = $localVer.Split('.')
        $parts[2] = [string]([int]$parts[2] + 1)
        $newVer = $parts -join '.'

        $raw = Get-Content "package.json" -Raw
        $raw = $raw.Replace("`"version`": `"$localVer`"", "`"version`": `"$newVer`"")
        [System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $raw)
        Write-Host "Bumped version: $localVer -> $newVer"

        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: build failed" -ForegroundColor Red; Pop-Location; exit 1 }

        git add -A
        git commit -m "$newVer"
        git push origin main
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: git push failed" -ForegroundColor Red; Pop-Location; exit 1 }
        git tag $newVer
        git push origin $newVer

        npm publish --access=public
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm publish failed" -ForegroundColor Red; Pop-Location; exit 1 }
    }

    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $publishedVer = $pkg.version
    Write-Host "`nPublished $pkgName@$publishedVer`n" -ForegroundColor Green
    $pushed++

    # --- Propagate version to dependents ---
    foreach ($otherDir in Get-ChildItem -Path $REPOS_DIR -Directory) {
        if ($otherDir.Name -eq $repoName) { continue }
        $otherPkgPath = Join-Path $otherDir.FullName "package.json"
        if (-not (Test-Path $otherPkgPath)) { continue }

        $otherPkg = Get-Content $otherPkgPath -Raw | ConvertFrom-Json
        $hasDep = $false
        if ($otherPkg.dependencies -and $otherPkg.dependencies.PSObject.Properties[$pkgName]) { $hasDep = $true }
        if ($otherPkg.devDependencies -and $otherPkg.devDependencies.PSObject.Properties[$pkgName]) { $hasDep = $true }

        if ($hasDep) {
            $targetVer = "^$publishedVer"
            $currentDep = $null
            if ($otherPkg.dependencies -and $otherPkg.dependencies.PSObject.Properties[$pkgName]) {
                $currentDep = $otherPkg.dependencies.$pkgName
            }

            if ($currentDep -eq $targetVer) {
                Write-Host "$($otherDir.Name) already has $pkgName@$targetVer"
            } else {
                Write-Host "Updating $pkgName to $targetVer in $($otherDir.Name)/package.json"
                Push-Location $otherDir.FullName
                node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));if(p.dependencies&&p.dependencies['$pkgName'])p.dependencies['$pkgName']='$targetVer';if(p.devDependencies&&p.devDependencies['$pkgName'])p.devDependencies['$pkgName']='$targetVer';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
                # refresh lockfile + node_modules so npm ci keeps working;
                # retry because the registry can lag right after publish
                $installed = $false
                foreach ($attempt in 1..3) {
                    npm install --no-audit --no-fund
                    if ($LASTEXITCODE -eq 0) { $installed = $true; break }
                    Start-Sleep -Seconds 10
                }
                if (-not $installed) {
                    Write-Host "ERROR: npm install failed in $($otherDir.Name)" -ForegroundColor Red
                    Pop-Location; Pop-Location
                    exit 1
                }
                git add package.json
                if (Test-Path "package-lock.json") { git add package-lock.json }
                git commit -m "chore(deps): update $pkgName to $publishedVer"
                Pop-Location
            }
            Write-Host ""
        }
    }

    Pop-Location
}

if ($pushed -eq 0) {
    Write-Host "Nothing to push - all repos are up to date."
} else {
    Write-Host "`n=== Verification ===" -ForegroundColor Cyan
    foreach ($dir in Get-ChildItem -Path $REPOS_DIR -Directory) {
        $pkgPath = Join-Path $dir.FullName "package.json"
        if (-not (Test-Path $pkgPath)) { continue }
        $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $lv = $pkg.version
        # registry reads can lag right after publish - retry before reporting a mismatch
        $nv = $null
        foreach ($attempt in 1..3) {
            $nv = npm view $pkg.name version 2>$null
            if ($nv -eq $lv) { break }
            Start-Sleep -Seconds 5
        }
        if (-not $nv) { $nv = "not published" }
        $st = if ($lv -eq $nv) { "OK" } else { "MISMATCH" }
        Write-Host "  $($dir.Name): Local $lv | NPM $nv [$st]"
    }
    Write-Host "`n=== Done: $pushed repo(s) pushed ===" -ForegroundColor Green
}
