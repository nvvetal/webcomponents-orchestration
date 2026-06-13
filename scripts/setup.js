#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const REPOS_DIR = path.join(ROOT_DIR, 'repositories');
const CONFIG_PATH = path.join(ROOT_DIR, 'repositories.json');

const repos = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

let cloned = 0;
let updated = 0;
let failed = 0;

for (const entry of repos) {
    const url = entry.url;
    const branch = entry.branch || 'main';
    const name = path.basename(url, '.git');
    const repoPath = path.join(REPOS_DIR, name);

    const exists = fs.existsSync(path.join(repoPath, '.git'));

    if (!exists) {
        console.log(`\nCloning ${name} ...`);
        try {
            execSync(`git clone --branch ${branch} ${url} ${name}`, {
                cwd: REPOS_DIR,
                stdio: 'inherit',
            });
            cloned++;
        } catch {
            console.error(`ERROR: failed to clone ${name}`);
            failed++;
            continue;
        }
    } else {
        console.log(`\nUpdating ${name} ...`);
        try {
            execSync('git pull', { cwd: repoPath, stdio: 'inherit' });
            updated++;
        } catch {
            console.error(`ERROR: failed to pull ${name}`);
            failed++;
            continue;
        }
    }

    console.log(`Installing dependencies in ${name} ...`);
    try {
        execSync('npm install', { cwd: repoPath, stdio: 'inherit' });
    } catch {
        console.error(`ERROR: npm install failed in ${name}`);
        failed++;
    }
}

console.log(`\n=== Setup complete: ${cloned} cloned, ${updated} updated, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
