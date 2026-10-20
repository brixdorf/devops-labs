import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './helpers.js';

describe('compose.yaml', () => {
  // A locally built image does not exist on any registry. Trying to pull it
  // first prints a "pull access denied" warning on every fresh install.
  it('never tries to pull the images it builds itself', () => {
    const compose = YAML.parse(fs.readFileSync(path.join(repoRoot, 'compose.yaml'), 'utf8'), { merge: true });
    const built = Object.entries(compose.services).filter(([, svc]) => svc.build);
    expect(built.map(([name]) => name)).toEqual(['app', 'uninstall']);
    for (const [name, svc] of built) expect(svc.pull_policy, `${name} pull_policy`).toBe('never');
  });
});
