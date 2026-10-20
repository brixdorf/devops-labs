// Progress saved in the browser by DevOps Labs v1.0.0 keeps working after an update.
import { expect, test } from '@playwright/test';
import { openLab, stopAnyLab } from './helpers.mjs';

const result = (labId, verdict, at) => ({
  labId,
  sessionId: 'v1session',
  submittedAt: at,
  runtimeMs: 640,
  total: 2,
  passed: verdict === 'correct' ? 2 : 1,
  errors: 0,
  error: null,
  verdict,
  tests: [
    { name: 'answer.txt exists', status: 'passed', message: 'Found /home/user/answer.txt' },
    { name: 'line 1 is the home directory', status: verdict === 'correct' ? 'passed' : 'failed', message: verdict === 'correct' ? 'Line 1 is /home/user' : 'Expected /home/user on line 1' },
  ],
});

// What v1.0.0 stored after viewing the solution, a wrong and a correct
// submission on Q1, and one wrong submission on Q2.
const V1_STORAGE = {
  'devops-labs:progress:v1': JSON.stringify({
    labs: {
      'linux-basic-commands': {
        solved: true,
        score: 25,
        solutionViewedAt: 1760900000000,
        submissions: [
          { no: 1, time: '2026-10-19T19:00:00.000Z', status: 'wrong', runtimeMs: 700, points: 0, penalty: true, sessionId: 'v1session', result: result('linux-basic-commands', 'wrong', '2026-10-19T19:00:00.000Z') },
          { no: 2, time: '2026-10-19T19:05:00.000Z', status: 'correct', runtimeMs: 650, points: 25, penalty: true, sessionId: 'v1session', result: result('linux-basic-commands', 'correct', '2026-10-19T19:05:00.000Z') },
        ],
      },
      'linux-ownership-audit': {
        solved: false,
        score: 0,
        solutionViewedAt: null,
        submissions: [{ no: 1, time: '2026-10-19T20:00:00.000Z', status: 'wrong', runtimeMs: 300, points: 0, penalty: false, sessionId: 'v1gone', result: result('linux-ownership-audit', 'wrong', '2026-10-19T20:00:00.000Z') }],
      },
    },
    prefs: { lastLab: 'linux-basic-commands', lastTopic: 'linux', testsOpen: true },
  }),
  'devops-labs:logs:v1': JSON.stringify(['v1session']),
  'devops-labs:log:v1session': JSON.stringify({ sessionId: 'v1session', labId: 'linux-basic-commands', hostname: 'lab-v1', startedAt: '2026-10-19T18:58:00.000Z', data: 'user@lab-v1:~$ echo v1-log-marker\r\nv1-log-marker\r\n' }),
};

test.beforeEach(async ({ page, request }) => {
  await stopAnyLab(request);
  await page.goto('/');
  await page.evaluate((items) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, V1_STORAGE);
  await page.reload();
});

test('progress saved by v1.0.0 shows its solved labs, submissions and session logs, without scores', async ({ page }) => {
  // The last lab opened in v1.0.0 opens again.
  await expect(page.locator('.panel-title')).toContainText('Basic Linux Commands');
  await expect(page.getByTestId('problems-solved')).toContainText('1 /');
  await expect(page.getByTestId('solved-badge')).toBeVisible();
  await expect(page.locator('[data-testid="rail-q1"] .rail-check')).toBeVisible();
  await expect(page.locator('[data-testid="rail-q2"] .rail-check')).toHaveCount(0);
  await expect(page.locator('.question-panel')).not.toContainText(/score/i);
  await expect(page.getByTestId('tests-body')).toContainText('Correct Answer');
  await expect(page.getByTestId('tests-body')).not.toContainText(/score/i);

  // The solution was viewed in v1.0.0; it just opens now.
  await page.getByTestId('tab-help').click();
  await expect(page.locator('.question-panel')).not.toContainText(/score|halve|penalty/i);
  await page.getByTestId('help-solution').locator('summary').click();
  await expect(page.getByTestId('help-solution')).toHaveAttribute('open', '');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByTestId('tab-submissions').click();
  const rows = page.getByTestId('submissions-table').locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Correct Answer');
  await expect(rows.nth(1)).toContainText('Wrong Answer');
  await rows.nth(1).click();
  await expect(page.getByTestId('tests-body')).toContainText('Expected /home/user on line 1');
  await rows.nth(1).getByRole('button', { name: 'View Session Log' }).click();
  await expect(page.getByTestId('session-log')).toContainText('v1-log-marker');
  await expect(page.getByTestId('session-log')).toContainText('Script started on');
  await page.keyboard.press('Escape');

  // A submission whose log is no longer stored says so.
  await openLab(page, 'Linux', 2);
  await page.getByTestId('tab-submissions').click();
  await page.getByTestId('submissions-table').locator('tbody tr').first().getByRole('button', { name: 'View Session Log' }).click();
  await expect(page.getByTestId('session-log')).toContainText('no longer stored');
  await page.keyboard.press('Escape');

  // The topic overview lists solved status without scores.
  await page.getByTestId('rail-all').click();
  await expect(page.locator('.lab-row').first()).toContainText('Solved');
  await expect(page.locator('.lab-row').nth(1)).toContainText('Not solved');
  await expect(page.locator('.all-labs')).not.toContainText('/ 50');

  // The saved data no longer carries the old score fields once it is saved again.
  await openLab(page, 'Linux', 1);
  const saved = await page.evaluate(() => localStorage.getItem('devops-labs:progress:v1'));
  expect(JSON.parse(saved).labs['linux-basic-commands'].submissions).toHaveLength(2);
  expect(saved).not.toMatch(/"(score|points|penalty|solutionViewedAt)"/);
});
