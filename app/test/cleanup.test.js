import { describe, expect, it } from 'vitest';
import { cleanupSessions, resetEverything } from '../server/cleanup.js';
import { FakeEngine } from './fake-engine.js';

const P = { 'org.devopslabs.project': 'devops-labs' };

async function populate() {
  const e = new FakeEngine();
  await e.createContainer({ name: 'lab-a', Labels: { ...P, 'org.devopslabs.session': 'a' } });
  await e.createContainer({ name: 'lab-b', Labels: { ...P, 'org.devopslabs.session': 'b' } });
  await e.createContainer({ name: 'app', Labels: { ...P, 'com.docker.compose.service': 'app' } });
  await e.createContainer({ name: 'someone-else', Labels: { other: 'x' } });
  await e.createNetwork('net-a', { ...P, 'org.devopslabs.session': 'a' });
  await e.createNetwork('user-net', {});
  await e.createVolume('vol-a', { ...P, 'org.devopslabs.session': 'a' });
  await e.createVolume('cache', { ...P, 'org.devopslabs.persist': 'cache' });
  await e.createVolume('orphan-data', { ...P });
  await e.createVolume('user-vol', {});
  return e;
}

const names = (map) => [...map.values()].map((x) => (x.Names ? x.Names[0].slice(1) : x.Name)).sort();

describe('cleanup', () => {
  it('removes one session without touching others', async () => {
    const e = await populate();
    const r = await cleanupSessions(e, 'a');
    expect(r).toEqual({ containers: 1, networks: 1, volumes: 1 });
    expect(names(e.containers)).toEqual(['app', 'lab-b', 'someone-else']);
  });

  it('removes every session but not the app, caches or foreign resources', async () => {
    const e = await populate();
    await cleanupSessions(e);
    expect(names(e.containers)).toEqual(['app', 'someone-else']);
    expect(names(e.networks)).toEqual(['user-net']);
    expect(names(e.volumes)).toEqual(['cache', 'orphan-data', 'user-vol']);
  });

  it('reset everything also clears leftover data volumes but keeps image caches', async () => {
    const e = await populate();
    await resetEverything(e);
    expect(names(e.volumes)).toEqual(['cache', 'user-vol']);
    expect(names(e.containers)).toEqual(['app', 'someone-else']);
  });
});
