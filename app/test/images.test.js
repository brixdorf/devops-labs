import { describe, expect, it } from 'vitest';
import { ImageBuilder, imageRecipes } from '../server/images.js';
import { FakeEngine } from './fake-engine.js';
import { repoRoot, versions } from './helpers.js';

const builder = (engine, options = {}) => new ImageBuilder({ engine, root: repoRoot, versions, ...options });

describe('image builds', () => {
  it('every environment and add-on image has a check of its tools', () => {
    for (const [name, recipe] of Object.entries(imageRecipes(versions))) {
      expect(recipe.check, `${name} has no check`).toMatch(/\S/);
    }
  });

  it('checks each image after building it', async () => {
    const engine = new FakeEngine();
    const tag = await builder(engine).ensure('docker');
    expect(engine.imageRuns.map((r) => r.image)).toEqual([builder(engine).tagFor('base'), tag]);
    expect(engine.imageRuns[0].cmd).toMatch(/curl/);
  });

  it('removes an image that fails its check and reports why', async () => {
    const engine = new FakeEngine();
    const images = builder(engine);
    engine.runHandler = () => ({ exitCode: 127, output: '/bin/sh: 1: curl: not found\n' });
    await expect(images.ensure('base')).rejects.toThrow(/base Linux environment image is broken.*curl: not found/);
    expect(engine.images.has(images.tagFor('base'))).toBe(false);
    // The next launch builds it again instead of reusing a broken image.
    engine.runHandler = null;
    await images.ensure('base');
    expect(engine.builds.filter((t) => t === images.tagFor('base'))).toHaveLength(2);
  });

  it('builds from scratch when asked: no build cache and fresh upstream images', async () => {
    const engine = new FakeEngine();
    const ubuntu = `ubuntu:${versions.images.ubuntu}`;
    engine.images.add(ubuntu);
    const images = builder(engine, { noCache: true });
    await images.ensure('base');
    expect(engine.pulls).toContain(ubuntu);
    expect(engine.buildOptions[0]).toMatchObject({ noCache: true });
  });

  it('removes images left by older versions at startup, dependent images first', async () => {
    const engine = new FakeEngine();
    const images = builder(engine);
    const removed = [];
    engine.listImages = async (labels) => {
      const name = labels['org.devopslabs.recipe'];
      return [
        { Id: `old-${name}`, RepoTags: [`devops-labs/${name}:0123456789ab`] },
        { Id: `current-${name}`, RepoTags: [images.tagFor(name)] },
      ];
    };
    engine.removeImage = async (ref) => removed.push(ref);
    await images.pruneStale();
    expect(removed.sort()).toEqual(Object.keys(images.recipes).map((n) => `old-${n}`).sort());
    const order = [];
    engine.removeImage = async (ref) => order.push(ref);
    await images.pruneStale();
    expect(order.indexOf('old-runner')).toBeLessThan(order.indexOf('old-docker'));
    expect(order.indexOf('old-docker')).toBeLessThan(order.indexOf('old-base'));
  });

  it('reuses images and the build cache by default', async () => {
    const engine = new FakeEngine();
    engine.images.add(`ubuntu:${versions.images.ubuntu}`);
    await builder(engine).ensure('base');
    expect(engine.pulls).toEqual([]);
    expect(engine.buildOptions[0].noCache).toBeFalsy();
  });
});
