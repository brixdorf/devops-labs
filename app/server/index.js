// DevOps Labs server entry point.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadConfig } from './config.js';
import { DockerEngine } from './engine.js';
import { ImageBuilder } from './images.js';
import { loadCatalog } from './labs.js';
import { SessionManager } from './session.js';
import { attachTerminalServer, createApp } from './api.js';
import { cleanupSessions } from './cleanup.js';
import { randomHex } from './util.js';

const config = loadConfig();
const versions = config.versions;
const engine = new DockerEngine();
const catalog = loadCatalog(config.labsDir);
for (const problem of catalog.problems) console.warn(`Lab problem: ${problem}`);

const images = new ImageBuilder({ engine, root: config.root, versions, log: () => {} });
const manager = new SessionManager({ engine, catalog, images, config, labLibDir: path.join(config.labsDir, '_lib') });

const selftestToken = randomHex(32);
fs.writeFileSync(config.selftestTokenFile, selftestToken, { mode: 0o600 });

const app = createApp({ manager, catalog, images, config, engine, selftestToken });
const server = http.createServer(app);
attachTerminalServer(server, manager);

async function main() {
  await engine.ping();
  const leftovers = await cleanupSessions(engine);
  if (leftovers.containers || leftovers.networks || leftovers.volumes) {
    console.log(`Removed leftover lab resources: ${leftovers.containers} containers, ${leftovers.networks} networks, ${leftovers.volumes} volumes`);
  }
  server.listen(config.listenPort, () => {
    console.log(`DevOps Labs is running. Open http://localhost:${config.hostPorts.app}`);
  });
  // Images left by an older release are removed, then the base environment
  // is prepared in the background on first start.
  images
    .pruneStale()
    .catch(() => {})
    .then(() => images.ensure('base', (line) => console.log(line)))
    .catch((err) => console.error(`Could not build the base environment: ${err.message}`));
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, removing lab resources`);
  server.close();
  try {
    await manager.shutdown();
    await cleanupSessions(engine);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
  console.error(`Could not start: ${err.message}`);
  console.error('Make sure Docker is running and the Docker socket is mounted.');
  process.exit(1);
});
