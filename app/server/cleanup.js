// Removes Docker resources the app created. Every function only touches
// resources that carry the project label.
import { PERSIST_LABEL, PROJECT_LABEL, PROJECT_VALUE, SESSION_LABEL } from './config.js';

const project = { [PROJECT_LABEL]: PROJECT_VALUE };

async function removeAll(items, fn) {
  const results = await Promise.allSettled(items.map(fn));
  return results.filter((r) => r.status === 'fulfilled' && r.value !== false).length;
}

// Removes lab session resources. With a session id, only that session;
// without one, every session (used at startup and shutdown).
export async function cleanupSessions(engine, sessionId) {
  const filter = { ...project, [SESSION_LABEL]: sessionId };
  const containers = await engine.listContainers(filter);
  const removedContainers = await removeAll(containers, (c) => engine.removeContainer(c.Id));
  const networks = await engine.listNetworks(filter);
  const removedNetworks = await removeAll(networks, (n) => engine.removeNetwork(n.Id || n.Name));
  const volumes = (await engine.listVolumes(filter)).filter((v) => !v.Labels?.[PERSIST_LABEL]);
  const removedVolumes = await removeAll(volumes, (v) => engine.removeVolume(v.Name));
  return { containers: removedContainers, networks: removedNetworks, volumes: removedVolumes };
}

// Returns the installation to its just-installed state while keeping images
// and image download caches.
export async function resetEverything(engine) {
  const sessions = await cleanupSessions(engine);
  const volumes = (await engine.listVolumes(project)).filter((v) => v.Labels?.[PERSIST_LABEL] !== 'cache' && !v.Labels?.['com.docker.compose.project']);
  const removedVolumes = await removeAll(volumes, (v) => engine.removeVolume(v.Name));
  return { ...sessions, volumes: sessions.volumes + removedVolumes };
}

export const BUILD_CACHE_PATTERN = /devops-labs|devopslabs/;
