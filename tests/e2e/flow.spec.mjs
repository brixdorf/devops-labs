// Full student flow on the Basic Linux Commands lab.
import { expect, test } from '@playwright/test';
import { launch, openLab, stopAnyLab, submit, typeInTerminal } from './helpers.mjs';

test.beforeEach(async ({ page, request }) => {
  await stopAnyLab(request);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('pick a lab, launch, work in the terminal, submit, review results, stop and reset', async ({ page, request }) => {
  // Pick topic and lab.
  await openLab(page, 'Linux', 1);
  await expect(page.locator('.panel-title')).toContainText('Basic Linux Commands');
  await expect(page.locator('.markdown')).toContainText('TASK 4: Find Hidden File');
  await expect(page.getByTestId('problems-solved')).toContainText('0 /');
  await expect(page.getByTestId('submit')).toBeDisabled();

  // The All view lists the topic's labs.
  await page.getByTestId('rail-all').click();
  await expect(page.locator('.lab-row').first()).toContainText('Basic Linux Commands');
  await page.getByTestId('rail-q1').click();

  // Hints, and the score penalty for viewing the complete solution.
  await page.getByTestId('use-hint').click();
  await page.getByTestId('help-hint').locator('summary').click();
  await expect(page.getByTestId('help-hint')).toContainText('pwd');
  await page.getByTestId('help-solution').locator('summary').click();
  await expect(page.getByRole('dialog')).toContainText('score will be halved');
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('help-solution')).toHaveAttribute('open', '');
  await expect(page.locator('.penalty-note')).toContainText('score half');
  await page.getByTestId('tab-question').click();

  // Launch.
  await launch(page);
  await expect(page.getByTestId('countdown')).toContainText(/Stops in 1[45]:\d\d/);
  await expect(page.getByTestId('submit')).toBeEnabled();

  // An untouched lab is a Wrong Answer with reasons.
  await submit(page);
  await expect(page.getByTestId('tests-body')).toContainText('Wrong Answer');
  await expect(page.getByTestId('tests-body')).toContainText('Expected /home/user/answer.txt but it was not found');
  await expect(page.getByTestId('tests-body')).toContainText('Initiating Evaluation');
  await expect(page.getByTestId('tests-body')).toContainText('Evaluating Code');
  await expect(page.getByTestId('tests-body')).toContainText(/Running Test Cases.*6 checks, 0 passed/s);

  // A second terminal tab works independently.
  await page.getByRole('button', { name: 'New terminal' }).click();
  await expect(page.getByRole('tab', { name: /Terminal 2/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: 30000 });
  await typeInTerminal(page, 'echo second-tab-$((6*7))');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('second-tab-42');
  await page.getByRole('tab', { name: /Terminal 1/ }).click();

  // Solve the lab by typing in the terminal.
  await typeInTerminal(page, 'echo $(pwd) >> /home/user/answer.txt && cd task_1 && echo cd >> /home/user/answer.txt');
  await typeInTerminal(page, 'ls && echo ls >> /home/user/answer.txt && ls -A | grep "^\\." >> /home/user/answer.txt');
  await typeInTerminal(page, 'cat /home/user/answer.txt');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('/home/user');

  await submit(page);
  await expect(page.getByTestId('tests-body')).toContainText('Correct Answer');
  await expect(page.getByTestId('tests-body')).toContainText('6 checks, 6 passed');
  await expect(page.getByTestId('solved-badge')).toBeVisible();
  await expect(page.getByTestId('your-score')).toHaveText('25');
  await expect(page.getByTestId('problems-solved')).toContainText('1 /');
  await expect(page.locator('[data-testid="rail-q1"] .rail-check')).toBeVisible();

  // Session log shows the start line and what was typed.
  await page.getByTestId('view-session-log').click();
  const log = page.getByTestId('session-log');
  await expect(log).toContainText('Script started on');
  await expect(log).toContainText('task_1');
  await page.keyboard.press('Escape');

  // Submissions table, and reopening an earlier result.
  await page.getByTestId('tab-submissions').click();
  const rows = page.getByTestId('submissions-table').locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Correct Answer');
  await expect(rows.nth(1)).toContainText('Wrong Answer');
  await rows.nth(1).click();
  await expect(page.getByTestId('tests-body')).toContainText('Wrong Answer');
  await rows.nth(0).click();
  await expect(page.getByTestId('tests-body')).toContainText('Correct Answer');

  // Stop Lab.
  await page.getByTestId('stop-lab').click();
  await expect(page.getByTestId('launch-lab')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('submit')).toBeDisabled();
  expect((await (await request.get('/api/session')).json()).session).toBeNull();

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByTestId('problems-solved')).toContainText('1 /');

  // Reset progress clears browser progress only.
  await page.getByTestId('settings-button').click();
  await page.getByTestId('reset-progress').click();
  await expect(page.getByRole('dialog')).toContainText('in this browser only');
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('problems-solved')).toContainText('0 /');
  await page.getByTestId('tab-question').click();
  await expect(page.getByTestId('your-score')).toHaveText('0');
});

test('reset everything stops the lab and clears progress', async ({ page, request }) => {
  await openLab(page, 'Linux', 1);
  await launch(page);
  await submit(page);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('reset-everything').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Stop the running lab');
  await expect(dialog).toContainText('Clear the Kubernetes cluster state');
  await expect(dialog).toContainText('environment images are kept');
  await expect(dialog).toContainText('Uninstalling and reinstalling');
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('launch-lab')).toBeVisible({ timeout: 60000 });
  expect((await (await request.get('/api/session')).json()).session).toBeNull();
  await page.getByTestId('tab-submissions').click();
  await expect(page.locator('.empty')).toContainText('No submissions yet');
});

test('cancelling the reset dialogs changes nothing', async ({ page }) => {
  await openLab(page, 'Linux', 1);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('reset-everything').click();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('launch-lab')).toBeVisible();
});
