// Install, stop and uninstall test. Uses exactly the documented commands:
//   docker compose up -d          (as a fresh install, without the app image)
//   docker compose down
//   docker compose run --rm uninstall
// It launches one lab from every environment in between, then checks that
// nothing carrying the project label is left behind.
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';

const work = process.argv[2] || process.cwd();
const LABEL = 'org.devopslabs.project=devops-labs';
const BASE = 'http://devops-labs-app-1:8800';
const self = os.hostname();
const failures = [];

function sh(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: work, stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function waitForApp() {
  spawnSync('docker', ['network', 'connect', 'devops-labs_default', self], { stdio: 'ignore' });
  for (let i = 0; i < 180; i += 1) {
    try {
      if ((await api('GET', '/api/health')).status === 200) return;
    } catch {
      // Not up yet.
    }
    await sleep(1000);
  }
  throw new Error('The app did not become healthy');
}

function leftovers() {
  const containers = docker('ps', '-a', '--filter', `label=${LABEL}`, '--format', '{{.ID}} {{.Names}} {{.Label "org.devopslabs.role"}}')
    .split('\n')
    .filter((l) => l && !l.endsWith(' test-runner'));
  const images = docker('images', '--filter', `label=${LABEL}`, '--format', '{{.ID}} {{.Repository}}:{{.Tag}}')
    .split('\n')
    .filter((l) => l && !l.includes('devops-labs-tests'));
  const volumes = docker('volume', 'ls', '--filter', `label=${LABEL}`, '--format', '{{.Name}}').split('\n').filter(Boolean);
  // The test runner's own network stays while the runner uses it.
  const runnerNetworks = docker('inspect', self, '--format', '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}').split(' ');
  const networks = docker('network', 'ls', '--filter', `label=${LABEL}`, '--format', '{{.Name}}')
    .split('\n')
    .filter((n) => n && !runnerNetworks.includes(n));
  const named = docker('ps', '-a', '--format', '{{.Names}}')
    .split('\n')
    .filter((n) => n.startsWith('devops-labs-') && !n.startsWith('devops-labs-tests'));
  return { containers, images, volumes, networks, named };
}

async function main() {
  // Start from a stopped platform.
  spawnSync('docker', ['network', 'disconnect', 'devops-labs_default', self], { stdio: 'ignore' });
  sh('docker', ['compose', 'down']);

  // A fresh install has no app image yet. Its first start must not try to
  // pull the locally built image ("pull access denied").
  console.log('\n--- install and start ---');
  spawnSync('docker', ['image', 'rm', 'devops-labs-app:local'], { stdio: 'inherit' });
  console.log('$ docker compose up -d');
  const install = spawnSync('docker', ['compose', 'up', '-d'], { cwd: work, encoding: 'utf8' });
  const installOutput = `${install.stdout}${install.stderr}`;
  process.stdout.write(installOutput);
  if (install.status !== 0) throw new Error(`docker compose up -d exited with ${install.status}`);
  if (/pull access denied|devops-labs-app:local\s+Pulling/i.test(installOutput)) failures.push('docker compose up -d tried to pull the locally built app image');
  await waitForApp();

  const { data } = await api('GET', '/api/topics');
  const labs = data.topics.flatMap((t) => t.labs);
  const seen = new Set();
  for (const env of ['base', 'systemd', 'docker', 'kubernetes', 'terraform']) {
    const lab = labs.find((l) => l.environment === env && l.addons.length === 0) || labs.find((l) => l.environment === env);
    if (!lab) {
      console.log(`\nNote: no lab uses the ${env} environment yet, so it is not launched.`);
      continue;
    }
    console.log(`\n--- launching ${lab.id} (${env}) ---`);
    const launch = await api('POST', '/api/session', { labId: lab.id });
    if (launch.status !== 202) {
      failures.push(`launching ${lab.id} returned ${launch.status}`);
      continue;
    }
    let state = 'launching';
    let last = '';
    for (let i = 0; i < 1800 && state === 'launching'; i += 1) {
      const s = (await api('GET', '/api/session')).data.session;
      state = s?.state || 'gone';
      const line = s?.progress?.at(-1);
      if (line && line !== last) console.log(`    ${(last = line)}`);
      if (state === 'launching') await sleep(1000);
    }
    if (state !== 'running') failures.push(`${lab.id} ended in state ${state}`);
    else seen.add(env);
    const sessionContainers = docker('ps', '--filter', 'label=org.devopslabs.session', '--format', '{{.Names}}').split('\n').filter(Boolean);
    console.log(`    running containers: ${sessionContainers.join(', ')}`);
  }

  console.log('\n--- stop ---');
  spawnSync('docker', ['network', 'disconnect', 'devops-labs_default', self], { stdio: 'ignore' });
  sh('docker', ['compose', 'down']);
  const afterStop = docker('ps', '-a', '--filter', 'label=org.devopslabs.session', '--format', '{{.Names}}').split('\n').filter(Boolean);
  if (afterStop.length) failures.push(`lab containers left after stop: ${afterStop.join(', ')}`);
  const appLeft = docker('ps', '-a', '--filter', 'label=com.docker.compose.project=devops-labs', '--format', '{{.Names}}').split('\n').filter(Boolean);
  if (appLeft.length) failures.push(`platform containers left after stop: ${appLeft.join(', ')}`);

  console.log('\n--- uninstall ---');
  sh('docker', ['compose', 'run', '--rm', 'uninstall']);
  let left = leftovers();
  for (let i = 0; i < 60; i += 1) {
    if (!left.containers.length && !left.images.length && !left.volumes.length && !left.networks.length && !left.named.length) break;
    await sleep(1000);
    left = leftovers();
  }
  for (const [kind, items] of Object.entries(left)) if (items.length) failures.push(`${kind} left after uninstall: ${items.join(', ')}`);

  console.log('\n--- docker ps -a / images / volume ls / network ls (project label) ---');
  console.log(docker('ps', '-a', '--filter', `label=${LABEL}`) || '(none)');
  console.log(docker('images', '--filter', `label=${LABEL}`) || '(none)');
  console.log(docker('volume', 'ls', '--filter', `label=${LABEL}`) || '(none)');
  console.log(docker('network', 'ls', '--filter', `label=${LABEL}`) || '(none)');

  console.log(`\nEnvironments launched: ${[...seen].join(', ')}`);
  if (failures.length) {
    console.log('\nInstall test failed:');
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log('\nInstall test passed. Only the test runner remains; start DevOps Labs again with: docker compose up -d');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
