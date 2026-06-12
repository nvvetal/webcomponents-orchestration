#!/usr/bin/env node
// Dispatch `npm run push` to the platform push script.
// Windows must use powershell.exe (npm auth tokens are not visible in Git Bash).
// Both scripts are interactive (npm 2FA), so stdio is inherited.
const { spawnSync } = require('child_process');
const path = require('path');

const win = process.platform === 'win32';
const script = path.join(__dirname, win ? 'push-all.ps1' : 'push-all.sh');
const cmd = win ? 'powershell' : 'bash';
const args = win
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script]
    : [script];

const result = spawnSync(cmd, args, { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
