// Runs the whole test suite in order and prints a summary:
//   1. rules check
//   2. unit and API tests, lab folder checks and lab lint
//   3. every environment and add-on image built from scratch, without cache
//   4. image builds that lose the internet connection, then get it back
//   5. browser end-to-end tests
//   6. lab self-tests
//   7. upgrade from v1.0.0 with git pull and docker compose up -d --build
//   8. install, stop and uninstall test
//
// Options: --skip <stage> (repeatable), --only <stage>, --with <stage>, --labs <selftest args>
// Stages: rules, unit, images, offline, e2e, selftest, upgrade, install, and versions
// (only with --with or --only: fails when a pinned version is not the newest stable one)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repo = process.env.DEVOPS_LABS_REPO || '/repo';
const args = process.argv.slice(2);
const skip = new Set();
const extra = new Set();
const OPT_IN = new Set(['versions']);
let only = null;
let labArgs = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--skip') skip.add(args[++i]);
  else if (args[i] === '--only') only = args[++i];
  else if (args[i] === '--with') extra.add(args[++i]);
  else if (args[i] === '--labs') labArgs = args.slice(i + 1);
}
const wanted = (stage) => (only ? only === stage : OPT_IN.has(stage) ? extra.has(stage) : !skip.has(stage));

const results = [];
function stage(name, fn) {
  if (!wanted(name)) {
    results.push({ name, status: 'skipped' });
    return;
  }
  console.log(`\n========== ${name} ==========`);
  const started = Date.now();
  let ok = false;
  try {
    ok = fn() !== false;
  } catch (err) {
    console.error(err.message);
    ok = false;
  }
  results.push({ name, status: ok ? 'passed' : 'failed', seconds: Math.round((Date.now() - started) / 1000) });
}

function run(cmd, cmdArgs, opts = {}) {
  console.log(`$ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  return r.status === 0;
}

// A working copy without node_modules, with dependencies from the image.
function workingCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-labs-'));
  const files = execFileSync('git', ['-C', repo, 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const f of files) {
    const src = path.join(repo, f);
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) continue;
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(src, path.join(dir, f));
  }
  fs.symlinkSync('/opt/devops-labs/deps/app/node_modules', path.join(dir, 'app', 'node_modules'));
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.symlinkSync('/opt/devops-labs/deps/tests/node_modules', path.join(dir, 'tests', 'node_modules'));
  return dir;
}

const work = workingCopy();
console.log(`Working copy: ${work}`);

stage('rules', () => {
  const rules = run('node', [path.join(work, 'tests/rules.mjs'), repo]);
  const synced = run('node', [path.join(work, 'tools/sync-versions.mjs'), '--check'], { env: { ...process.env, DEVOPS_LABS_REPO: work } });
  return rules && synced;
});
stage('unit', () => {
  const unit = run('npx', ['vitest', 'run'], { cwd: path.join(work, 'app') });
  const lint = run('node', [path.join(work, 'tests/lint-labs.mjs'), work]);
  return unit && lint;
});

function platformUp() {
  if (!run('docker', ['compose', 'up', '-d', '--build', '--wait', '--wait-timeout', '300'], { cwd: work })) return false;
  // Join the platform network so the app is reachable as http://devops-labs-app-1:8800.
  const self = os.hostname();
  spawnSync('docker', ['network', 'connect', 'devops-labs_default', self], { stdio: 'ignore' });
  return true;
}

stage('images', () => {
  if (!platformUp()) return false;
  return run('docker', ['compose', 'exec', '-T', 'app', 'node', 'server/build-images.js', '--no-cache'], { cwd: work });
});

stage('offline', () => run('node', [path.join(work, 'tests/offline.mjs'), work], { cwd: work }));

stage('e2e', () => {
  if (!platformUp()) return false;
  return run('npx', ['playwright', 'test', '--config', path.join(work, 'tests/playwright.config.mjs')], {
    cwd: path.join(work, 'tests'),
    env: { ...process.env, DEVOPS_LABS_URL: 'http://devops-labs-app-1:8800', DEVOPS_LABS_REPO: repo },
  });
});

stage('selftest', () => {
  if (!platformUp()) return false;
  return run('docker', ['compose', 'exec', '-T', 'app', 'node', 'server/selftest.js', ...labArgs], { cwd: work });
});

stage('upgrade', () => run('node', [path.join(work, 'tests/upgrade.mjs'), work], { cwd: work }));

stage('install', () => run('node', [path.join(work, 'tests/install.mjs'), work], { cwd: work }));

stage('versions', () => run('node', [path.join(work, 'tools/update-versions.mjs'), '--check'], { env: { ...process.env, DEVOPS_LABS_REPO: work } }));

console.log('\n========== summary ==========');
for (const r of results) console.log(`${r.status.padEnd(8)} ${r.name}${r.seconds !== undefined ? ` (${r.seconds}s)` : ''}`);
const failed = results.filter((r) => r.status === 'failed');
console.log(failed.length ? `\n${failed.length} stage(s) failed.` : '\nAll stages passed.');
process.exit(failed.length ? 1 : 0);
