// Dropped connection test with real Docker. Environment images are built on
// an internal Docker network, which has no internet, so their downloads fail
// the way they do when the connection drops. Each failure must say so
// clearly and leave no containers or images behind. Building again with the
// connection back must work without any cleanup.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const work = process.argv[2] || process.cwd();
const server = (name) => import(path.join(work, 'app', 'server', name));
const { DockerEngine } = await server('engine.js');
const { ImageBuilder } = await server('images.js');
const { loadConfig } = await server('config.js');

const NETWORK = 'devops-labs-offline-test';
const LABEL = 'org.devopslabs.project=devops-labs';
const { versions } = loadConfig({ DEVOPS_LABS_ROOT: work });
const failures = [];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const ids = (...args) => new Set(docker(...args).split('\n').filter(Boolean));
const difference = (after, before) => [...after].filter((x) => !before.has(x));

// noCache rebuilds the image even though it exists; base is built once and
// treated as already rebuilt, so only the image under test is built.
async function builder({ offline }) {
  const engine = new DockerEngine();
  if (offline) engine.buildNetwork = NETWORK;
  const images = new ImageBuilder({ engine, root: work, versions, noCache: true });
  if (!offline) await new ImageBuilder({ engine, root: work, versions }).ensure('base', () => {});
  images.fresh.add('base');
  return images;
}

async function offlineBuild(name, detail) {
  const images = await builder({ offline: true });
  const tag = images.tagFor(name);
  const tagBefore = docker('images', '-q', '--no-trunc', tag);
  const imagesBefore = ids('images', '-aq', '--no-trunc');
  const containersBefore = ids('ps', '-aq', '--no-trunc');
  console.log(`\n--- building ${name} without internet ---`);
  const err = await images.ensure(name, (line) => console.log(`    ${line}`)).then(
    () => null,
    (e) => e,
  );
  if (!err) return failures.push(`${name} was built although the build had no internet`);
  console.log(`    message: ${err.message}`);
  if (!/internet connection/i.test(err.message) || !/Check your connection, then click Try Again/.test(err.message)) failures.push(`${name}: the message does not explain the dropped connection: ${err.message}`);
  if (!err.message.includes(detail)) failures.push(`${name}: the message does not include "${detail}"`);
  if (/\u001b/.test(err.message)) failures.push(`${name}: the message contains terminal colour codes`);
  const newImages = difference(ids('images', '-aq', '--no-trunc'), imagesBefore);
  const newContainers = difference(ids('ps', '-aq', '--no-trunc'), containersBefore);
  if (newImages.length) failures.push(`${name}: the failed build left images behind: ${newImages.join(', ')}`);
  if (newContainers.length) failures.push(`${name}: the failed build left containers behind: ${newContainers.join(', ')}`);
  if (docker('images', '-q', '--no-trunc', tag) !== tagBefore) failures.push(`${name}: the failed build changed ${tag}`);
}

try {
  execFileSync('docker', ['network', 'rm', NETWORK], { stdio: 'ignore' });
} catch {
  // Not there.
}
docker('network', 'create', '--internal', '--label', LABEL, NETWORK);
try {
  // Make sure base exists, with the internet available.
  await builder({ offline: false });
  // curl in the Terraform image, apt-get in the simulated services image.
  await offlineBuild('terraform', 'Could not resolve host: releases.hashicorp.com');
  await offlineBuild('sim', 'Temporary failure resolving');

  console.log('\n--- connection back: building terraform again ---');
  const images = await builder({ offline: false });
  try {
    const tag = await images.ensure('terraform', (line) => console.log(`    ${line}`));
    console.log(`    built ${tag}`);
  } catch (err) {
    failures.push(`terraform did not build once the connection was back: ${err.message}`);
  }
} finally {
  docker('network', 'rm', NETWORK);
}

if (failures.length) {
  console.log('\nDropped connection test failed:');
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log('\nDropped connection test passed: clear messages, nothing left behind, and the build works once the connection is back.');
