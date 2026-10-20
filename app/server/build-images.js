// Builds every environment and add-on image and checks the tools in each.
// Runs inside the app container:
//   docker compose exec app node server/build-images.js [--no-cache] [name ...]
// With --no-cache every image is built from scratch: fresh upstream images and
// no build cache, as on a computer that never ran DevOps Labs.
import { loadConfig } from './config.js';
import { DockerEngine } from './engine.js';
import { ImageBuilder } from './images.js';

const args = process.argv.slice(2);
const noCache = args.includes('--no-cache');
const config = loadConfig();
const images = new ImageBuilder({ engine: new DockerEngine(), root: config.root, versions: config.versions, noCache });
const names = args.filter((a) => !a.startsWith('--'));
const wanted = names.length ? names : Object.keys(images.recipes);

const results = [];
for (const name of wanted) {
  if (!images.recipes[name]) {
    results.push({ name, ok: false, message: 'unknown image' });
    continue;
  }
  const started = Date.now();
  console.log(`\n--- ${name} ---`);
  try {
    const tag = await images.ensure(name, (line) => console.log(`  ${line}`));
    results.push({ name, ok: true, message: `${tag} (${Math.round((Date.now() - started) / 1000)}s)` });
  } catch (err) {
    console.log(`  ${err.message}`);
    results.push({ name, ok: false, message: err.message });
  }
}

console.log(`\n========== images${noCache ? ' (built from scratch)' : ''} ==========`);
for (const r of results) console.log(`${r.ok ? 'passed' : 'FAILED'}  ${r.name.padEnd(12)} ${r.message}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} image(s) failed.` : '\nEvery image was built and passed its check.');
process.exit(failed ? 1 : 0);
