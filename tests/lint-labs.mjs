// Syntax checks for every lab: Python checkers compile, shell scripts parse,
// and lab text uses only known placeholders.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();
const labsDir = path.join(root, 'labs');
const KNOWN = new Set(['GITEA_URL', 'GITEA_USER', 'GITEA_PASSWORD', 'GRAFANA_URL', 'GRAFANA_USER', 'GRAFANA_PASSWORD', 'PROMETHEUS_URL', 'ARGOCD_URL', 'ARGOCD_USER', 'ARGOCD_PASSWORD', 'REGISTRY_USER', 'REGISTRY_PASSWORD', 'SUDO_PASSWORD']);
const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
for (const key of ['nginx', 'httpd', 'postgres', 'python', 'busybox', 'alpine', 'redis']) KNOWN.add(`IMAGE_${key.toUpperCase()}`);

const problems = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(labsDir);
for (const file of files) {
  const rel = path.relative(root, file);
  if (file.endsWith('.py')) {
    const r = spawnSync('python3', ['-c', 'import ast,sys; ast.parse(open(sys.argv[1]).read(), sys.argv[1])', file], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(`${rel}: ${r.stderr.trim().split('\n').pop()}`);
  } else if (file.endsWith('.sh')) {
    const r = spawnSync('bash', ['-n', file], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(`${rel}: ${r.stderr.trim()}`);
  } else if (file.endsWith('.md')) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/\{\{\s*([A-Z_]+)\s*\}\}/g)) {
      if (!KNOWN.has(m[1])) problems.push(`${rel}: unknown placeholder {{${m[1]}}}`);
    }
  }
}
// Pinned lab images must come from versions.json, not be typed into lab files.
const pinned = Object.values(versions.images);
for (const file of files.filter((f) => /\.(md|sh|py|ya?ml)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const tag of pinned) {
    if (tag.length > 4 && text.includes(`:${tag}`)) problems.push(`${path.relative(root, file)}: hard-coded image tag ${tag}, use the IMAGE_ variables`);
  }
}
if (problems.length) {
  console.log(`Lab lint found ${problems.length} problems:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`Lab lint passed: ${files.length} files checked.`);
