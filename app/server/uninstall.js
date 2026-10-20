// Removes everything DevOps Labs created: containers (including the ones the
// app started itself), volumes, networks, images and build cache entries.
//
// Run with: docker compose run --rm uninstall
//
// The uninstall container cannot delete the image it runs from, so as a last
// step it starts a short-lived helper container that waits for the uninstall
// container to exit and then removes that final image and network.
import os from 'node:os';
import { DockerEngine, packFiles } from './engine.js';
import { PROJECT_LABEL, PROJECT_VALUE, ROLE_LABEL } from './config.js';
import { BUILD_CACHE_PATTERN } from './cleanup.js';
import { sleep } from './util.js';

const project = { [PROJECT_LABEL]: PROJECT_VALUE };
const engine = new DockerEngine();
const docker = engine.docker;

async function findSelf() {
  const hostname = os.hostname();
  const containers = await engine.listContainers(project);
  return containers.find((c) => c.Id.startsWith(hostname)) || null;
}

async function removeBuildCache() {
  const records = await engine.listBuildCache();
  const selected = new Set(records.filter((r) => BUILD_CACHE_PATTERN.test(r.Description || '')).map((r) => r.ID));
  // Include records built on top of selected ones.
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of records) {
      const parents = r.Parents || (r.Parent ? [r.Parent] : []);
      if (!selected.has(r.ID) && parents.some((p) => selected.has(p))) {
        selected.add(r.ID);
        grew = true;
      }
    }
  }
  await engine.pruneBuildCache([...selected]);
  return selected.size;
}

async function uninstall() {
  console.log('Uninstalling DevOps Labs. This removes every container, image, volume, network');
  console.log('and build cache entry the project created. Your cloned folder is not touched.');
  const self = await findSelf();
  const selfImage = self ? (await engine.inspectContainer(self.Id)).Image : null;

  const containers = (await engine.listContainers(project)).filter(
    (c) => c.Id !== self?.Id && c.Labels?.[ROLE_LABEL] !== 'test-runner',
  );
  // The app first, so it does not start anything new while we clean up.
  containers.sort((a, b) => Number(Boolean(b.Labels?.['com.docker.compose.service'])) - Number(Boolean(a.Labels?.['com.docker.compose.service'])));
  for (const c of containers) await engine.removeContainer(c.Id);
  console.log(`Removed ${containers.length} containers`);

  // Networks that this container or a running test runner still use are
  // left out: they cannot be removed while in use.
  const selfNetworks = new Set(Object.keys(self?.NetworkSettings?.Networks || {}));
  const inUse = new Set(selfNetworks);
  for (const c of await engine.listContainers({ ...project, [ROLE_LABEL]: 'test-runner' })) {
    for (const name of Object.keys(c.NetworkSettings?.Networks || {})) inUse.add(name);
  }
  const networks = (await engine.listNetworks(project)).filter((n) => !inUse.has(n.Name));
  let removedNetworks = 0;
  for (const n of networks) {
    const removed = await engine.removeNetwork(n.Id).catch((err) => console.log(`Could not remove the network ${n.Name}: ${err.message}`));
    if (removed) removedNetworks += 1;
  }
  console.log(`Removed ${removedNetworks} networks`);

  const volumes = await engine.listVolumes(project);
  for (const v of volumes) await engine.removeVolume(v.Name);
  console.log(`Removed ${volumes.length} volumes`);

  // Images: children before parents, so repeat until nothing more goes.
  let removedImages = 0;
  for (let pass = 0; pass < 6; pass += 1) {
    const images = (await engine.listImages(project)).filter((i) => i.Id !== selfImage);
    if (!images.length) break;
    for (const image of images) {
      if (await engine.removeImage(image.Id, { force: true }).catch(() => false)) removedImages += 1;
    }
  }
  console.log(`Removed ${removedImages} images`);

  const cache = await removeBuildCache().catch(() => 0);
  console.log(`Removed ${cache} build cache entries`);

  if (self && selfImage) await startFinisher(self, selfImage, [...selfNetworks]);
  console.log('DevOps Labs has been uninstalled. You can now delete the devops-labs folder.');
}

// Starts the helper that removes the uninstall container's own image.
async function startFinisher(self, selfImage, networks) {
  // The helper needs an image with a different ID than ours, or our image
  // could not be deleted while the helper runs. A one-line build on top of
  // our image gives it one, sharing all layers.
  const tag = 'devops-labs-uninstall-helper:latest';
  const context = packFiles([{ name: 'Dockerfile', content: `FROM ${selfImage}\nLABEL ${ROLE_LABEL}=uninstall-helper\n` }]);
  const stream = await docker.buildImage(context, { t: tag, version: '1', rm: true, forcerm: true });
  await new Promise((resolve, reject) => docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve())));
  const helperImage = (await engine.imageInspect(tag)).Id;
  const helper = await docker.createContainer({
    Image: helperImage,
    Cmd: ['node', 'server/uninstall.js', '--finish', self.Id, selfImage, ...networks],
    Labels: {},
    HostConfig: { AutoRemove: true, NetworkMode: 'none', Binds: ['/var/run/docker.sock:/var/run/docker.sock'] },
  });
  // The helper is created but not running, so its image can be deleted now;
  // the created container keeps the layers it needs until it exits.
  await engine.removeImage(helperImage, { force: true });
  await helper.start();
}

async function finish(selfId, selfImage, networks) {
  for (let i = 0; i < 240; i += 1) {
    if (!(await engine.inspectContainer(selfId))) break;
    await sleep(500);
  }
  await engine.removeImage(selfImage, { force: true }).catch(() => {});
  for (const name of networks) await engine.removeNetwork(name).catch(() => {});
  for (const n of await engine.listNetworks(project)) await engine.removeNetwork(n.Id).catch(() => {});
  for (const image of await engine.listImages(project)) await engine.removeImage(image.Id, { force: true }).catch(() => {});
}

const args = process.argv.slice(2);
const run = args[0] === '--finish' ? finish(args[1], args[2], args.slice(3)) : uninstall();
run.catch((err) => {
  console.error(`Uninstall failed: ${err.message}`);
  process.exit(1);
});
