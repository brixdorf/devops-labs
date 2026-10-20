// What the student sees when a launch failed because the internet connection
// dropped. The server side of this is tested with real Docker in
// tests/offline.mjs; here the browser gets that failed session as it is sent.
import { expect, test } from '@playwright/test';
import { stopAnyLab } from './helpers.mjs';

const MESSAGE =
  'The base Linux environment image could not be built: the internet connection seems to be down or too slow. Nothing was left half-built. Check your connection, then click Try Again. (Temporary failure resolving \'archive.ubuntu.com\')';

const failedSession = {
  id: 'a1b2c3d4e5',
  labId: 'linux-basic-commands',
  state: 'failed',
  hostname: 'f00dfeedbeef',
  startedAt: Date.now(),
  expiresAt: null,
  idleTimeoutMs: 900000,
  progress: ['Preparing the base environment', 'Preparing environment, first time only', `Launch failed: ${MESSAGE}`],
  error: MESSAGE,
  services: [],
  submitting: false,
};

test('a launch that lost the internet connection explains it and Try Again launches again', async ({ page, request }) => {
  await stopAnyLab(request);
  let launches = 0;
  await page.route('**/api/events', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: `data: ${JSON.stringify({ type: 'session', session: failedSession })}\n\n` }));
  await page.route('**/api/session', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { session: failedSession } });
    if (route.request().method() === 'POST') {
      launches += 1;
      expect(route.request().postDataJSON()).toEqual({ labId: 'linux-basic-commands' });
      return route.fulfill({ status: 202, json: { session: { ...failedSession, id: 'f6e5d4c3b2', state: 'launching', error: null, progress: ['Preparing the base environment'] } } });
    }
    return route.continue();
  });
  await page.goto('/#/lab/linux-basic-commands');

  const error = page.locator('.launch-error');
  await expect(error).toContainText('The lab could not start.');
  await expect(error).toContainText('the internet connection seems to be down or too slow');
  await expect(error).toContainText('Check your connection, then click Try Again.');
  await expect(error).toContainText("Temporary failure resolving 'archive.ubuntu.com'");
  await expect(page.getByTestId('launch-lab')).toHaveText(/Try Again/);

  await page.getByTestId('launch-lab').click();
  await expect(page.getByTestId('launching')).toBeVisible();
  expect(launches).toBe(1);
});
