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

  // No scores anywhere.
  await expect(page.locator('.question-panel')).not.toContainText(/score/i);

  // Hints, and the complete solution opens straight away without a penalty.
  await page.getByTestId('use-hint').click();
  await expect(page.locator('.question-panel')).not.toContainText(/score|halve|penalty/i);
  await page.getByTestId('help-hint').locator('summary').click();
  await expect(page.getByTestId('help-hint')).toContainText('pwd');
  await page.getByTestId('help-solution').locator('summary').click();
  await expect(page.getByTestId('help-solution')).toHaveAttribute('open', '');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('help-solution')).toContainText('answer.txt');
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
  const tab1 = page.getByRole('tab', { name: /Terminal 1/ });
  const tab2 = page.getByRole('tab', { name: /Terminal 2/ });
  await expect(tab2).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: 30000 });
  await typeInTerminal(page, 'echo second-tab-$((6*7))');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('second-tab-42');

  // Ctrl+Shift+PageUp and Ctrl+Shift+PageDown switch terminal tabs (the
  // browser keeps Ctrl+Tab and Ctrl+PageUp/PageDown for its own tabs), and
  // the keys go to the terminal that was switched to.
  await expect(tab1).toHaveAttribute('title', /Ctrl\+Shift\+PageUp/);
  await page.keyboard.press('Control+Shift+PageUp');
  await expect(tab1).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.type('echo first-tab-$((2*3))', { delay: 5 });
  await page.keyboard.press('Enter');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('first-tab-6');
  await page.keyboard.press('Control+Shift+PageDown');
  await expect(tab2).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.term-pane.active .xterm-rows')).not.toContainText('first-tab-6');
  // It wraps around, and works while the focus is outside the terminal.
  await page.locator('.panel-title').click();
  await page.keyboard.press('Control+Shift+PageDown');
  await expect(tab1).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Control+Shift+PageUp');
  await expect(tab2).toHaveAttribute('aria-selected', 'true');
  await tab1.click();

  // Solve the lab by typing in the terminal.
  await typeInTerminal(page, 'echo $(pwd) >> /home/user/answer.txt && cd task_1 && echo cd >> /home/user/answer.txt');
  await typeInTerminal(page, 'ls && echo ls >> /home/user/answer.txt && ls -A | grep "^\\." >> /home/user/answer.txt');
  await typeInTerminal(page, 'cat /home/user/answer.txt');
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('/home/user');

  await submit(page);
  await expect(page.getByTestId('tests-body')).toContainText('Correct Answer');
  await expect(page.getByTestId('tests-body')).toContainText('6 checks, 6 passed');
  await expect(page.getByTestId('solved-badge')).toBeVisible();
  await expect(page.getByTestId('tests-body')).not.toContainText(/score/i);
  await expect(page.locator('.question-panel')).not.toContainText(/score/i);
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

  // Every submission opens the session log it was submitted from.
  for (const i of [1, 0]) {
    await rows.nth(i).getByRole('button', { name: 'View Session Log' }).click();
    const rowLog = page.getByTestId('session-log');
    await expect(rowLog).toContainText('Script started on');
    await expect(rowLog).toContainText('Basic Linux Commands');
    await expect(rowLog).toContainText('first-tab-6');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

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
  await expect(page.getByRole('dialog')).not.toContainText(/score/i);
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('problems-solved')).toContainText('0 /');
  await page.getByTestId('tab-question').click();
  await expect(page.getByTestId('solved-badge')).toHaveCount(0);
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
  await expect(dialog).not.toContainText(/score/i);
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
