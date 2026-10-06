import { test, expect } from '@playwright/test';

test('application renders and its critical browser path works', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });
  page.on('requestfailed', request => {
    failedRequests.push(
      `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`
    );
  });

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'application navigation returned no response').not.toBeNull();
  expect(response?.ok(), 'application navigation was not successful').toBeTruthy();
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'CI/CD Browser Gate' })).toBeVisible();
  await expect(page.getByText('The application is running.')).toBeVisible();

  const health = await page.request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ status: 'ok' });

  expect(consoleErrors, `browser console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  expect(failedRequests, `failed browser requests: ${failedRequests.join('\n')}`).toEqual([]);
});
