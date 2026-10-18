// Shared fixtures: a temporary labs folder and a session manager wired to the fake engine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../server/labs.js';
import { ImageBuilder } from '../server/images.js';
import { SessionManager } from '../server/session.js';
import { RESULT_MARKER } from '../server/checker.js';
import { FakeEngine } from './fake-engine.js';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const versions = JSON.parse(fs.readFileSync(path.join(repoRoot, 'versions.json'), 'utf8'));

const LAB_FILES = {
  'question.md': 'Do the thing.',
  'hint.md': 'A hint.',
  'approach.md': 'An approach.',
  'solution.md': 'The solution.',
  'setup.sh': 'echo setup',
  'check.py': 'print("check")',
  'solve.sh': 'echo solve',
};

export function makeLabsDir(labs = defaultLabs()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-labs-test-'));
  fs.mkdirSync(path.join(dir, '_lib'));
  fs.writeFileSync(path.join(dir, '_lib', 'labcheck.py'), '# helper');
  const topicDir = path.join(dir, '01-sample');
  fs.mkdirSync(topicDir);
  fs.writeFileSync(path.join(topicDir, 'topic.yaml'), 'id: sample\nname: Sample Topic\norder: 1\n');
  labs.forEach((lab, i) => {
    const labDir = path.join(topicDir, `${String(i + 1).padStart(2, '0')}-${lab.id}`);
    fs.mkdirSync(labDir);
    const meta = { topic: 'sample', order: i + 1, environment: 'base', addons: [], ...lab };
    fs.writeFileSync(
      path.join(labDir, 'lab.yaml'),
      Object.entries(meta)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n'),
    );
    for (const [name, content] of Object.entries(LAB_FILES)) fs.writeFileSync(path.join(labDir, name), content);
  });
  return dir;
}

export function defaultLabs() {
  return [
    { id: 'first-lab', title: 'First Lab' },
    { id: 'second-lab', title: 'Second Lab' },
    { id: 'docker-lab', title: 'Docker Lab', environment: 'docker' },
    { id: 'gitea-lab', title: 'Gitea Lab', addons: ['gitea'] },
  ];
}

export function testConfig(labsDir, overrides = {}) {
  return {
    root: repoRoot,
    versions,
    labsDir,
    webDir: null,
    listenPort: 0,
    idleTimeoutMs: 60000,
    hostPorts: { app: 8800, gitea: 8801, grafana: 8802, prometheus: 8803, argocd: 8804 },
    selftestTokenFile: path.join(labsDir, 'token'),
    ...overrides,
  };
}

export function checkerOutput(tests) {
  return `some log line\n${RESULT_MARKER}${JSON.stringify({ tests })}\n`;
}

export function setup(overrides = {}) {
  const labsDir = makeLabsDir(overrides.labs);
  const config = testConfig(labsDir, overrides.config);
  const engine = new FakeEngine();
  // Every container reports ready, every TCP probe succeeds.
  const catalog = loadCatalog(labsDir);
  const images = new ImageBuilder({ engine, root: repoRoot, versions });
  const logger = { log() {}, error() {}, warn() {} };
  const manager = new SessionManager({ engine, catalog, images, config, labLibDir: path.join(labsDir, '_lib'), logger });
  return { labsDir, config, engine, catalog, images, manager };
}

export async function waitForState(manager, wanted, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = manager.view();
    if ((v?.state ?? null) === wanted) return v;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`Session did not reach ${wanted}; it is ${manager.view()?.state ?? 'none'}`);
}
