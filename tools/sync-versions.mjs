// Copies pinned versions from versions.json into the few files that cannot
// read it directly (Dockerfile defaults and package.json files).
//   node tools/sync-versions.mjs          write the files
//   node tools/sync-versions.mjs --check  only report files that are out of date
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.DEVOPS_LABS_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));

function setArg(text, name, value) {
  const re = new RegExp(`^(ARG ${name}=).*$`, 'm');
  if (!re.test(text)) throw new Error(`ARG ${name} not found`);
  return text.replace(re, `$1${value}`);
}

const edits = [
  {
    file: 'Dockerfile',
    apply: (t) => setArg(t, 'NODE_IMAGE', `node:${versions.images.node}`),
  },
  {
    file: 'tests/Dockerfile',
    apply: (t) => {
      let out = setArg(t, 'PLAYWRIGHT_IMAGE', `mcr.microsoft.com/playwright:${versions.images.playwright}`);
      out = setArg(out, 'DOCKER_CE_VERSION', versions.tools.docker_ce);
      out = setArg(out, 'COMPOSE_VERSION', versions.tools.compose_plugin);
      return setArg(out, 'BUILDX_VERSION', versions.tools.buildx_plugin);
    },
  },
  {
    file: 'app/package.json',
    apply: (t) => {
      const pkg = JSON.parse(t);
      for (const section of ['dependencies', 'devDependencies']) {
        for (const name of Object.keys(pkg[section] || {})) {
          if (!versions.npm[name]) throw new Error(`app/package.json: ${name} is not in versions.json`);
          pkg[section][name] = versions.npm[name];
        }
      }
      return `${JSON.stringify(pkg, null, 2)}\n`;
    },
  },
  {
    file: 'tests/package.json',
    apply: (t) => {
      const pkg = JSON.parse(t);
      for (const name of Object.keys(pkg.devDependencies || {})) pkg.devDependencies[name] = versions.npm[name];
      return `${JSON.stringify(pkg, null, 2)}\n`;
    },
  },
];

const stale = [];
for (const edit of edits) {
  const file = path.join(root, edit.file);
  const before = fs.readFileSync(file, 'utf8');
  const after = edit.apply(before);
  if (after !== before) {
    stale.push(edit.file);
    if (!check) fs.writeFileSync(file, after);
  }
}

if (check) {
  if (stale.length) {
    console.log(`These files do not match versions.json: ${stale.join(', ')}`);
    console.log('Run: node tools/sync-versions.mjs');
    process.exit(1);
  }
  console.log('All pinned versions match versions.json.');
} else {
  console.log(stale.length ? `Updated: ${stale.join(', ')}` : 'Everything already matches versions.json.');
}
