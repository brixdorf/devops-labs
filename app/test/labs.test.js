import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog, readLabText, validateLab } from '../server/labs.js';
import { makeLabsDir, repoRoot } from './helpers.js';

describe('lab catalog', () => {
  it('loads topics and labs in order', () => {
    const catalog = loadCatalog(makeLabsDir());
    expect(catalog.problems).toEqual([]);
    expect(catalog.topics.map((t) => t.id)).toEqual(['sample']);
    expect(catalog.topics[0].labs.map((l) => l.id)).toEqual(['first-lab', 'second-lab', 'docker-lab', 'gitea-lab']);
    expect(catalog.labs.get('first-lab')).not.toHaveProperty('maxScore');
  });

  it('still loads a lab.yaml written for v1.0.0 that sets maxScore', () => {
    const catalog = loadCatalog(makeLabsDir([{ id: 'old-lab', title: 'Old Lab', maxScore: 50 }]));
    expect(catalog.problems).toEqual([]);
    expect(catalog.labs.get('old-lab')).not.toHaveProperty('maxScore');
  });

  it('reports missing files and bad metadata', () => {
    const dir = makeLabsDir([{ id: 'broken', title: 'Broken', environment: 'mainframe', addons: ['jenkins'] }]);
    const labDir = path.join(dir, '01-sample', '01-broken');
    fs.rmSync(path.join(labDir, 'check.py'));
    const problems = loadCatalog(dir).problems.join('\n');
    expect(problems).toMatch(/missing check.py/);
    expect(problems).toMatch(/unknown environment "mainframe"/);
    expect(problems).toMatch(/unknown add-on "jenkins"/);
  });

  it('rejects duplicate ids and mismatched topics', () => {
    const dir = makeLabsDir([
      { id: 'same', title: 'A' },
      { id: 'same', title: 'B' },
      { id: 'elsewhere', title: 'C', topic: 'other' },
    ]);
    const problems = loadCatalog(dir).problems.join('\n');
    expect(problems).toMatch(/duplicate lab id same/);
    expect(problems).toMatch(/does not match folder topic/);
  });

  it('validates argocd only with kubernetes', () => {
    const dir = makeLabsDir([{ id: 'x', title: 'X', addons: ['argocd'] }]);
    const labDir = path.join(dir, '01-sample', '01-x');
    expect(validateLab(labDir, { id: 'x', title: 'X', topic: 'sample', order: 1, environment: 'base', addons: ['argocd'] })).toContain(
      'argocd needs the kubernetes environment',
    );
  });

  it('substitutes placeholders in lab text', () => {
    const catalog = loadCatalog(makeLabsDir());
    const lab = catalog.labs.get('first-lab');
    fs.writeFileSync(path.join(lab.dir, 'question.md'), 'Open {{GITEA_URL}} and keep {{UNKNOWN}}');
    expect(readLabText(lab, 'question.md', { GITEA_URL: 'http://localhost:8801' })).toBe('Open http://localhost:8801 and keep {{UNKNOWN}}');
  });

  it('every lab in the repository is complete and valid', () => {
    const catalog = loadCatalog(path.join(repoRoot, 'labs'));
    expect(catalog.problems).toEqual([]);
    expect(catalog.labs.size).toBeGreaterThan(0);
    for (const lab of catalog.labs.values()) {
      expect(fs.readFileSync(path.join(lab.dir, 'lab.yaml'), 'utf8'), `${lab.id} lab.yaml`).not.toMatch(/maxScore/);
    }
    for (const topic of catalog.topics) {
      const orders = topic.labs.map((l) => l.order);
      expect(new Set(orders).size, `${topic.id} has duplicate lab orders`).toBe(orders.length);
    }
  });
});
