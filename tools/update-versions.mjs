// Maintainer tool: moves every pinned dependency to its newest stable
// version, rebuilds everything and runs the full test suite.
//
//   docker compose -f tests/compose.yaml run --build --rm update [-- --dry-run] [-- --no-test]
//
// Steps: look up the newest versions, update versions.json, sync the files
// that copy versions from it, refresh lock files, rebuild the images, run
// tests/run-all.mjs, and print a report of changes and results.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.DEVOPS_LABS_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const noTest = process.argv.includes('--no-test');
const versionsFile = path.join(root, 'versions.json');
const versions = JSON.parse(fs.readFileSync(versionsFile, 'utf8'));
const lookupErrors = [];

// ---------- lookups ----------

async function getJson(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, { headers: { 'user-agent': 'devops-labs-update', ...headers } });
    if (res.ok) return res.json();
    if (res.status === 404) throw new Error(`${url}: not found`);
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(`${url}: request failed`);
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'devops-labs-update' } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

const ghHeaders = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const github = async (repo) => (await getJson(`https://api.github.com/repos/${repo}/releases/latest`, ghHeaders)).tag_name;
const npm = async (name) => (await getJson(`https://registry.npmjs.org/${name}/latest`)).version;
const pypi = async (name) => (await getJson(`https://pypi.org/pypi/${name}/json`)).info.version;

function cmpVersion(a, b) {
  const pa = a.split(/[.-]/).map((x) => (Number.isNaN(Number(x)) ? x : Number(x)));
  const pb = b.split(/[.-]/).map((x) => (Number.isNaN(Number(x)) ? x : Number(x)));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    if (pa[i] === pb[i]) continue;
    if (typeof pa[i] === 'number' && typeof pb[i] === 'number') return pa[i] - pb[i];
    return String(pa[i]).localeCompare(String(pb[i]));
  }
  return 0;
}

async function hubTags(repo, pages = 4) {
  const tags = [];
  let url = `https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100&ordering=last_updated`;
  for (let i = 0; i < pages && url; i += 1) {
    const data = await getJson(url);
    tags.push(...data.results.map((t) => t.name));
    url = data.next;
  }
  return tags;
}

// Newest Docker Hub tag of the form <semver><suffix>, for example 1.30.6-alpine.
async function hubSemver(repo, current, { filter = () => true } = {}) {
  const m = current.match(/^v?(\d+(?:\.\d+)*)(.*)$/);
  const prefix = current.startsWith('v') ? 'v' : '';
  const suffix = m[2];
  const depth = m[1].split('.').length;
  const re = new RegExp(`^${prefix}(\\d+(?:\\.\\d+){${depth - 1}})${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const candidates = (await hubTags(repo))
    .map((t) => t.match(re))
    .filter(Boolean)
    .map((x) => x[1])
    .filter(filter);
  if (!candidates.length) throw new Error(`${repo}: no tags like ${current}`);
  candidates.sort(cmpVersion);
  return `${prefix}${candidates.at(-1)}${suffix}`;
}

async function ubuntuTag(current) {
  const codename = current.split('-')[0];
  const tags = (await hubTags('library/ubuntu')).filter((t) => new RegExp(`^${codename}-\\d{8}(\\.\\d+)?$`).test(t));
  tags.sort((a, b) => cmpVersion(a.slice(codename.length + 1), b.slice(codename.length + 1)));
  return tags.at(-1) || current;
}

async function nodeLts(current) {
  const index = await getJson('https://nodejs.org/dist/index.json');
  const latest = index.find((r) => r.lts);
  return `${latest.version.slice(1)}-${current.split('-').slice(1).join('-')}`;
}

async function dockerApt(ubuntu) {
  const codename = ubuntu.split('-')[0];
  const text = await getText(`https://download.docker.com/linux/ubuntu/dists/${codename}/stable/binary-amd64/Packages`);
  const latest = {};
  let pkg = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('Package: ')) pkg = line.slice(9).trim();
    if (line.startsWith('Version: ') && pkg) {
      const v = line.slice(9).trim().replace(/^\d+:/, '').split('-')[0];
      if (!latest[pkg] || cmpVersion(v, latest[pkg]) > 0) latest[pkg] = v;
    }
  }
  return latest;
}

async function terraformProvider(name) {
  const data = await getJson(`https://registry.terraform.io/v1/providers/${name}/versions`);
  const stable = data.versions.map((v) => v.version).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
  stable.sort(cmpVersion);
  return stable.at(-1);
}

const strip = (v) => v.replace(/^v/, '');
const stable = (v) => !/rc|alpha|beta|pre/i.test(v);

const plan = [];
const add = (section, key, fn) => plan.push({ section, key, fn });

const img = versions.images;
add('images', 'node', () => nodeLts(img.node));
add('images', 'ubuntu', () => ubuntuTag(img.ubuntu));
add('images', 'k3s', async () => (await github('k3s-io/k3s')).replace('+', '-'));
add('images', 'gitea', async () => strip(await github('go-gitea/gitea')));
add('images', 'act_runner', () => hubSemver('gitea/act_runner', img.act_runner));
add('images', 'registry', () => hubSemver('library/registry', img.registry));
add('images', 'moto', () => hubSemver('motoserver/moto', img.moto));
add('images', 'prometheus', () => github('prometheus/prometheus'));
add('images', 'grafana', async () => strip(await github('grafana/grafana')));
add('images', 'playwright', async () => `v${await npm('@playwright/test')}-${img.playwright.split('-').slice(1).join('-')}`);
// nginx publishes its stable line with an even minor version.
add('images', 'nginx', () => hubSemver('library/nginx', img.nginx, { filter: (v) => Number(v.split('.')[1]) % 2 === 0 }));
for (const key of ['httpd', 'postgres', 'python', 'busybox', 'alpine', 'redis']) {
  add('images', key, () => hubSemver(`library/${key}`, img[key], { filter: stable }));
}
add('images', 'podinfo', () => hubSemver('stefanprodan/podinfo', img.podinfo));
// The rolling update lab needs an older release: the newest one of the previous minor line.
add('images', 'podinfo_previous', async () => {
  const latest = await hubSemver('stefanprodan/podinfo', img.podinfo);
  const [major, minor] = latest.split('.').map(Number);
  return hubSemver('stefanprodan/podinfo', img.podinfo_previous, { filter: (v) => Number(v.split('.')[0]) === major && Number(v.split('.')[1]) === minor - 1 });
});

add('tools', 'kubectl', async () => `v${(await github('k3s-io/k3s')).replace(/^v/, '').split('+')[0]}`);
add('tools', 'helm', () => github('helm/helm'));
add('tools', 'terraform', async () => strip(await github('hashicorp/terraform')));
add('tools', 'argocd', () => github('argoproj/argo-cd'));
add('tools', 'trivy', async () => strip(await github('aquasecurity/trivy')));
add('tools', 'gitleaks', async () => strip(await github('gitleaks/gitleaks')));
let aptCache = null;
const apt = async () => (aptCache ||= await dockerApt(versions.images.ubuntu));
add('tools', 'docker_ce', async () => (await apt())['docker-ce']);
add('tools', 'containerd', async () => (await apt())['containerd.io']);
add('tools', 'compose_plugin', async () => (await apt())['docker-compose-plugin']);
add('tools', 'buildx_plugin', async () => (await apt())['docker-buildx-plugin']);

for (const name of Object.keys(versions.terraform_providers)) add('terraform_providers', name, () => terraformProvider(name));
for (const name of Object.keys(versions.actions)) add('actions', name, () => github(name));
for (const name of Object.keys(versions.pip)) add('pip', name, () => pypi(name));
for (const name of Object.keys(versions.npm)) add('npm', name, () => npm(name));

// ---------- run ----------

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts }).status === 0;
}

async function main() {
  console.log(`Looking up the newest stable version of ${plan.length} pinned dependencies...`);
  const changes = [];
  for (const item of plan) {
    const current = versions[item.section][item.key];
    try {
      const latest = await item.fn();
      if (latest && latest !== current) {
        changes.push({ section: item.section, key: item.key, from: current, to: latest });
        versions[item.section][item.key] = latest;
      }
    } catch (err) {
      lookupErrors.push(`${item.section}.${item.key}: ${err.message}`);
    }
  }

  console.log('\n========== version report ==========');
  if (!changes.length) console.log('Everything is already at the newest stable version.');
  for (const c of changes) console.log(`${`${c.section}.${c.key}`.padEnd(40)} ${c.from} -> ${c.to}`);
  for (const e of lookupErrors) console.log(`lookup failed: ${e}`);
  if (dryRun) {
    console.log('\nDry run: nothing was written.');
    return;
  }

  fs.writeFileSync(versionsFile, `${JSON.stringify(versions, null, 2)}\n`);
  const steps = [];
  steps.push(['sync files from versions.json', run('node', ['tools/sync-versions.mjs'])]);
  if (changes.some((c) => c.section === 'npm')) {
    steps.push(['refresh app/package-lock.json', run('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: path.join(root, 'app') })]);
    steps.push(['refresh tests/package-lock.json', run('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: path.join(root, 'tests') })]);
  }
  steps.push(['rebuild the app image', run('docker', ['compose', 'build', '--pull', 'app'])]);
  steps.push(['rebuild the test image', run('docker', ['compose', '-f', 'tests/compose.yaml', 'build', 'tests'])]);
  // Environment images are tagged by a hash of their inputs, so the new
  // versions are built automatically the first time the self-test needs them.
  if (!noTest) steps.push(['full test suite', run('node', ['tests/run-all.mjs'])]);

  console.log('\n========== update report ==========');
  console.log(`${changes.length} version(s) changed:`);
  for (const c of changes) console.log(`  ${`${c.section}.${c.key}`.padEnd(40)} ${c.from} -> ${c.to}`);
  for (const e of lookupErrors) console.log(`  lookup failed: ${e}`);
  for (const [name, ok] of steps) console.log(`${ok ? 'passed' : 'FAILED'}  ${name}`);
  const failed = steps.filter(([, ok]) => !ok).length + lookupErrors.length;
  console.log(failed ? '\nThe update needs attention before it is committed.' : '\nAll steps passed. Review the changes with git diff and commit them.');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
