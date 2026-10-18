// Walks through one lab end to end in a real browser and captures the README
// screenshots: launch, solve, submit (wrong, then correct), session log.
//   docker compose -f tests/compose.yaml run --rm tests node tests/screenshots.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const { chromium, expect } = await import('/opt/devops-labs/deps/tests/node_modules/@playwright/test/index.mjs');
const repo = process.env.DEVOPS_LABS_REPO || '/repo';
const out = path.join(repo, 'docs', 'images');
const base = process.env.DEVOPS_LABS_URL || 'http://devops-labs-app-1:8800';
spawnSync('docker', ['network', 'connect', 'devops-labs_default', os.hostname()], { stdio: 'ignore' });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const shot = async (name, opts = {}) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, name), ...opts });
  console.log(`wrote docs/images/${name}`);
};
const term = () => page.locator('.term-pane.active .xterm');
const type = async (text) => {
  await term().click();
  await page.keyboard.type(text, { delay: 8 });
  await page.keyboard.press('Enter');
};

await fetch(`${base}/api/session`, { method: 'DELETE' }).catch(() => {});
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/#/lab/linux-basic-commands`);
await expect(page.locator('.markdown')).toContainText('TASK 1', { timeout: 30000 });
await shot('screenshot-question.png');

await page.getByTestId('launch-lab').click();
await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: 10 * 60 * 1000 });
await type('pwd && ls -la --color=always task_1');
await type('uname -sr; whoami');
await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('Linux');

// Wrong answer first: two of four answers.
await type('echo $(pwd) >> /home/user/answer.txt && echo cd >> /home/user/answer.txt');
await page.getByTestId('submit').click();
await expect(page.getByTestId('tests-body')).toContainText('Wrong Answer', { timeout: 120000 });
await page.getByTestId('tests-body').evaluate((el) => (el.scrollTop = el.scrollHeight));
await shot('screenshot-wrong.png', { clip: await page.locator('.lab-column').boundingBox() });

// Then solve it completely.
await type('cd task_1 && echo ls >> /home/user/answer.txt && ls -A | grep "^\\." >> /home/user/answer.txt && cat /home/user/answer.txt');
await page.waitForTimeout(800);
await shot('screenshot-terminal.png');
await page.getByTestId('submit').click();
await expect(page.getByTestId('tests-body')).toContainText('Correct Answer', { timeout: 120000 });
await page.getByTestId('tests-body').evaluate((el) => (el.scrollTop = 0));
await shot('screenshot-correct.png', { clip: await page.locator('.lab-column').boundingBox() });

await page.getByTestId('view-session-log').click();
await expect(page.getByTestId('session-log')).toContainText('Script started on');
await shot('screenshot-session-log.png');
await page.keyboard.press('Escape');
await page.getByTestId('stop-lab').click();
await browser.close();

const { uid, gid } = fs.statSync(repo);
for (const f of fs.readdirSync(out)) if (f.startsWith('screenshot-')) fs.chownSync(path.join(out, f), uid, gid);
