// Lab startup when the internet connection drops while an image downloads or
// an environment image builds: a clear message, nothing half-built left
// behind, and Try Again works once the connection is back.
import { describe, expect, it } from 'vitest';
import { ImageBuilder } from '../server/images.js';
import { SESSION_LABEL } from '../server/config.js';
import { FakeEngine } from './fake-engine.js';
import { repoRoot, setup, versions, waitForState } from './helpers.js';

const UBUNTU = `ubuntu:${versions.images.ubuntu}`;
const PULL_DROPPED = 'Get "https://registry-1.docker.io/v2/": dial tcp: lookup registry-1.docker.io on 192.168.65.7:53: no such host';
const APT_DROPPED = [
  'Step 5/12 : RUN apt-get update && apt-get install -y curl',
  ' ---> Running in 4b1c2d3e4f5a',
  "Err:1 http://archive.ubuntu.com/ubuntu resolute InRelease",
  "  Temporary failure resolving 'archive.ubuntu.com'",
  "E: Failed to fetch http://archive.ubuntu.com/ubuntu/dists/resolute/InRelease  Temporary failure resolving 'archive.ubuntu.com'",
  ' ---> Removed intermediate container 4b1c2d3e4f5a',
];

// The connection drops for the next `times` downloads or builds, then comes back.
function dropPulls(engine, times = 1) {
  const pull = engine.pullImage.bind(engine);
  let left = times;
  engine.pullImage = async (ref, onProgress) => {
    if (left > 0) {
      left -= 1;
      throw new Error(PULL_DROPPED);
    }
    return pull(ref, onProgress);
  };
}

function dropBuilds(engine, times = 1) {
  let left = times;
  engine.buildHandler = ({ onProgress }) => {
    if (left <= 0) return;
    left -= 1;
    for (const line of APT_DROPPED) onProgress(line);
    throw new Error("The command '/bin/sh -c apt-get update && apt-get install -y curl' returned a non-zero code: 100");
  };
}

const projectImages = (engine) => [...engine.images].filter((ref) => ref.startsWith('devops-labs/'));

function leftovers(engine, sessionId) {
  return {
    containers: [...engine.containers.values()].filter((c) => c.Labels[SESSION_LABEL] === sessionId).length,
    networks: [...engine.networks.values()].filter((n) => n.Labels[SESSION_LABEL] === sessionId).length,
    volumes: [...engine.volumes.values()].filter((v) => v.Labels[SESSION_LABEL] === sessionId).length,
  };
}

describe('dropped internet connection while preparing an environment', () => {
  it('a failed download says the connection dropped and how to continue', async () => {
    const engine = new FakeEngine();
    const images = new ImageBuilder({ engine, root: repoRoot, versions });
    dropPulls(engine);
    const err = await images.ensure('base').catch((e) => e);
    expect(err.message).toMatch(/internet connection/i);
    expect(err.message).toMatch(/Try Again/);
    expect(err.message).toContain(UBUNTU);
    expect(err.message).toContain('no such host');
    expect(projectImages(engine)).toEqual([]);
    expect(engine.images.has(UBUNTU)).toBe(false);
  });

  it('a build cut off by a dropped connection says so and keeps nothing it downloaded', async () => {
    const engine = new FakeEngine();
    const images = new ImageBuilder({ engine, root: repoRoot, versions });
    dropBuilds(engine);
    const err = await images.ensure('base').catch((e) => e);
    expect(err.message).toMatch(/base Linux environment/);
    expect(err.message).toMatch(/internet connection/i);
    expect(err.message).toMatch(/Try Again/);
    expect(err.message).toContain("Temporary failure resolving 'archive.ubuntu.com'");
    expect(projectImages(engine)).toEqual([]);
    // The Ubuntu image was downloaded only for this build, so it is removed again.
    expect(engine.images.has(UBUNTU)).toBe(false);
    expect(engine.imageRuns).toEqual([]);
  });

  it('other build failures keep their own message', async () => {
    const engine = new FakeEngine();
    const images = new ImageBuilder({ engine, root: repoRoot, versions });
    engine.buildHandler = ({ onProgress }) => {
      onProgress('/bin/sh: 1: frobnicate: not found');
      throw new Error("The command '/bin/sh -c frobnicate' returned a non-zero code: 127");
    };
    const err = await images.ensure('base').catch((e) => e);
    expect(err.message).toMatch(/^Building the base Linux environment image failed: .*frobnicate: not found/);
    expect(err.message).not.toMatch(/internet/i);
  });

  it('builds normally once the connection is back, without any cleanup', async () => {
    const engine = new FakeEngine();
    const images = new ImageBuilder({ engine, root: repoRoot, versions });
    dropPulls(engine);
    await expect(images.ensure('docker')).rejects.toThrow(/internet connection/i);
    dropBuilds(engine);
    await expect(images.ensure('docker')).rejects.toThrow(/internet connection/i);
    const tag = await images.ensure('docker');
    expect(tag).toBe(images.tagFor('docker'));
    expect(projectImages(engine).sort()).toEqual([images.tagFor('base'), tag].sort());
  });

  it.each([
    ['downloading an image', dropPulls],
    ['building an environment image', dropBuilds],
  ])('a lab launch that loses the connection while %s fails cleanly and Try Again starts it', async (what, drop) => {
    const { manager, engine } = setup();
    drop(engine);
    await manager.launch('docker-lab');
    const failed = await waitForState(manager, 'failed');
    expect(failed.error).toMatch(/internet connection/i);
    expect(failed.error).toMatch(/Check your connection, then click Try Again/);
    expect(failed.progress.at(-1)).toMatch(/internet connection/i);
    await new Promise((r) => setTimeout(r, 20));
    expect(leftovers(engine, failed.id)).toEqual({ containers: 0, networks: 0, volumes: 0 });
    expect(projectImages(engine)).toEqual([]);
    expect(engine.images.has(UBUNTU)).toBe(false);

    // Try Again, with the connection back.
    await manager.launch('docker-lab');
    const running = await waitForState(manager, 'running');
    expect(running.id).not.toBe(failed.id);
    expect(running.error).toBeFalsy();
  });
});
