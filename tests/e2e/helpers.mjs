import { expect } from '@playwright/test';

export const LAB = { topic: 'Linux', number: 1, id: 'linux-basic-commands' };

export async function stopAnyLab(request) {
  await request.delete('/api/session').catch(() => {});
}

export async function openLab(page, topicName, number) {
  await page.getByTestId('topic-button').click();
  await page.getByRole('option', { name: new RegExp(topicName) }).first().click();
  await page.getByTestId(`rail-q${number}`).click();
}

export async function launch(page) {
  await page.getByTestId('launch-lab').click();
  await expect(page.getByTestId('launching')).toBeVisible();
  await expect(page.locator('.term-pane.active .xterm')).toBeVisible({ timeout: 10 * 60 * 1000 });
  // Wait for the shell prompt.
  await expect(page.locator('.term-pane.active .xterm-rows')).toContainText('user@', { timeout: 60000 });
}

export async function typeInTerminal(page, text) {
  await page.locator('.term-pane.active .xterm').click();
  await page.keyboard.type(text, { delay: 5 });
  await page.keyboard.press('Enter');
}

export async function submit(page) {
  await expect(page.getByTestId('submit')).toBeEnabled();
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('tests-body')).toContainText('Final Verdict', { timeout: 5 * 60 * 1000 });
}
