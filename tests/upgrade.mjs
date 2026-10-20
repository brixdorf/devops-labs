// Upgrade test: someone uses DevOps Labs v1.0.0, then updates with the
// documented commands:
//   git pull
//   docker compose up -d --build
// The app must start without errors, keep the progress saved in the browser,
// and not be tripped up by the images, containers and volumes v1.0.0 left in
// Docker. A Docker lab is left running during the update on purpose.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const work = process.argv[2] || process.cwd();
const repo = process.env.DEVOPS_LABS_REPO || '/repo';
const FROM = process.env.DEVOPS_LABS_UPGRADE_FROM || 'v1.0.0';
const BASE = 'http://devops-labs-app-1:8800';
const self = os.hostname();
const LONG = 10 * 60 * 1000;
const failures = [];

function sh(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  process.stdout.write(output);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
  return output;
}

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const lines = (text) => text.split('\n').filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, body) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function waitForApp() {
  spawnSync('docker', ['network', 'connect', 'devops-labs_default', self], { stdio: 'ignore' });
  for (let i = 0; i < 300; i += 1) {
    try {
      if ((await api('GET', '/api/health')).status === 200) return;
    } catch {
      // Not up yet.
    }
    await sleep(1000);
  }
  throw new Error('The app did not become healthy');
}

async function launchAndWait(labId) {
  const launch = await api('POST', '/api/session', { labId });
  if (launch.status !== 202) throw new Error(`launching ${labId} returned ${launch.status}`);
  let last = '';
  for (let i = 0; i < 1800; i += 1) {
    const s = (await api('GET', '/api/session')).data.session;
    const line = s?.progress?.at(-1);
    if (line && line !== last) console.log(`    ${(last = line)}`);
    if (s?.state === 'running') return s;
    if (s?.state !== 'launching') throw new Error(`${labId} ended in state ${s?.state || 'gone'}: ${s?.error || ''}`);
    await sleep(1000);
  }
  throw new Error(`${labId} did not start`);
}

async function type(page, text) {
  await page.locator('.term-pane.active .xterm').click();
  await page.keyboard.type(text, { delay: 5 });
  await page.keyboard.press('Enter');
}

async function main() {
  // 1. Install the old version, exactly as it was released.
  const old = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-labs-old-'));
  execFileSync('git', ['-C', repo, 'archive', '--format=tar', '-o', path.join(old, 'src.tar'), FROM]);
  execFileSync('tar', ['-xf', 'src.tar'], { cwd: old });
  fs.rmSync(path.join(old, 'src.tar'));
  console.log(`\n--- install ${FROM} ---`);
  spawnSync('docker', ['network', 'disconnect', 'devops-labs_default', self], { stdio: 'ignore' });
  sh('docker', ['compose', 'down'], work);
  sh('docker', ['compose', 'up', '-d', '--build'], old);
  await waitForApp();

  // 2. Use it: solve a lab in the browser, then leave a Docker lab running.
  console.log(`\n--- use ${FROM} ---`);
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/lab/linux-basic-commands');
  await page.getByTestId('launch-lab').click();
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: LONG });
  await type(page, 'echo $(pwd) >> /home/user/answer.txt && cd task_1 && echo cd >> /home/user/answer.txt');
  await type(page, 'ls && echo ls >> /home/user/answer.txt && ls -A | grep "^\\." >> /home/user/answer.txt && echo old-version-marker');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('tests-body')).toContainText('Correct Answer', { timeout: LONG });
  const storage = await context.storageState();
  await context.close();
  await launchAndWait('docker-run-nginx');
  const oldSessionContainers = lines(docker('ps', '--filter', 'label=org.devopslabs.session', '--format', '{{.Names}}'));
  const oldImages = lines(docker('images', '--filter', 'label=org.devopslabs.recipe', '--format', '{{.Repository}}:{{.Tag}}'));
  console.log(`    left running: ${oldSessionContainers.join(', ')}`);
  console.log(`    images: ${oldImages.join(', ')}`);

  // 3. Update with the documented commands.
  console.log('\n--- update: docker compose up -d --build ---');
  const output = sh('docker', ['compose', 'up', '-d', '--build'], work);
  if (/pull access denied/i.test(output)) failures.push('docker compose up -d --build printed "pull access denied"');
  await waitForApp();

  // 4. Nothing from the old session is left, and stale environment images are gone.
  const stillThere = lines(docker('ps', '-a', '--filter', 'label=org.devopslabs.session', '--format', '{{.Names}}'));
  if (stillThere.length) failures.push(`containers of the ${FROM} lab are still there: ${stillThere.join(', ')}`);
  const logs = docker('compose', '--project-directory', work, 'logs', 'app');
  if (/Could not|Lab problem/.test(logs)) failures.push(`the app log reports a problem:\n${logs}`);

  // 5. The browser progress from the old version is still there, without scores.
  console.log('\n--- check progress and labs on the new version ---');
  const newContext = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 }, storageState: storage });
  const newPage = await newContext.newPage();
  await newPage.goto('/#/lab/linux-basic-commands');
  try {
    await expect(newPage.getByTestId('problems-solved')).toContainText('1 /');
    await expect(newPage.getByTestId('solved-badge')).toBeVisible();
    await expect(newPage.locator('.question-panel')).not.toContainText(/score/i);
    await newPage.getByTestId('tab-submissions').click();
    const rows = newPage.getByTestId('submissions-table').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Correct Answer');
    await rows.first().getByRole('button', { name: 'View Session Log' }).click();
    await expect(newPage.getByTestId('session-log')).toContainText('old-version-marker');
    await newPage.keyboard.press('Escape');

    // 6. Labs work: the Docker lab (reusing the old image cache volume) and the Linux lab.
    console.log('    launching docker-run-nginx');
    await launchAndWait('docker-run-nginx');
    await newPage.reload();
    await expect(newPage.getByTestId('launch-lab')).toBeVisible();
    await newPage.getByTestId('launch-lab').click();
    await expect(newPage.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: LONG });
    await type(newPage, 'cat /home/user/answer.txt 2>/dev/null; echo new-version-marker');
    await newPage.getByTestId('submit').click();
    await expect(newPage.getByTestId('tests-body')).toContainText('Wrong Answer', { timeout: LONG });
    await newPage.getByTestId('tab-submissions').click();
    await expect(rows).toHaveCount(2);
    await expect(newPage.getByTestId('problems-solved')).toContainText('1 /');
  } catch (err) {
    failures.push(err.message.split('\n').slice(0, 6).join('\n'));
  }
  await browser.close();
  await api('DELETE', '/api/session').catch(() => {});

  // Older builds of an environment are removed, so each image has one tag.
  const tags = new Map();
  for (const ref of lines(docker('images', '--filter', 'label=org.devopslabs.recipe', '--format', '{{.Repository}}:{{.Tag}}'))) {
    const [name] = ref.split(':');
    if (name === '<none>') continue;
    tags.set(name, [...(tags.get(name) || []), ref]);
  }
  for (const refs of tags.values()) if (refs.length > 1) failures.push(`images of ${FROM} were not cleaned up: ${refs.filter((r) => oldImages.includes(r)).join(', ')}`);
  fs.rmSync(old, { recursive: true, force: true });

  if (failures.length) {
    console.log('\nUpgrade test failed:');
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log(`\nUpgrade test passed: ${FROM} updated with docker compose up -d --build, progress kept, labs work.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
