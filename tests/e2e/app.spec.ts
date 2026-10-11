import { test, expect } from '@playwright/test';

const configuredBaseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ignoredRequestFailureSubstrings = (process.env.E2E_IGNORED_REQUEST_FAILURE_SUBSTRINGS ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const ignoredHttpErrorSubstrings = (process.env.E2E_IGNORED_HTTP_ERROR_SUBSTRINGS ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

function redactSensitiveQueryValues(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, '[REDACTED]');
    }
    return url.toString();
  } catch {
    return '[unparseable URL]';
  }
}

function redactLikelySecrets(text: string): string {
  return text.replace(
    /([?&](?:key|api[_-]?key|token|access_token|authorization|secret|password)=)[^&\s"'<>]+/gi,
    '$1[REDACTED]'
  );
}

test('application renders and reports no critical browser or API failures', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  const base = new URL(configuredBaseUrl);

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(redactLikelySecrets(message.text()));
    }
  });

  page.on('pageerror', error => {
    pageErrors.push(redactLikelySecrets(error.message));
  });

  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText ?? 'unknown';
    const requestUrl = new URL(request.url());
    const isKnownVercelToolbarAbort =
      requestUrl.pathname === '/.well-known/vercel/jwe' &&
      requestUrl.origin === base.origin &&
      failure === 'net::ERR_ABORTED';
    const explicitlyIgnored = ignoredRequestFailureSubstrings.some(value =>
      request.url().includes(value)
    );

    if (!isKnownVercelToolbarAbort && !explicitlyIgnored) {
      failedRequests.push(
        `${request.method()} ${redactSensitiveQueryValues(request.url())} :: ${failure}`
      );
    }
  });

  page.on('response', response => {
    const status = response.status();
    const request = response.request();
    const responseUrl = new URL(response.url());
    const isFirstParty = responseUrl.origin === base.origin;
    const isApiCall = ['fetch', 'xhr'].includes(request.resourceType());
    const explicitlyIgnored = ignoredHttpErrorSubstrings.some(value =>
      response.url().includes(value)
    );

    // Catch failed APIs even when fetch() successfully receives an HTTP 4xx/5xx response.
    // Same-origin document and asset failures are also treated as critical.
    if (status >= 400 && (isFirstParty || isApiCall) && !explicitlyIgnored) {
      badResponses.push(
        `${request.method()} ${redactSensitiveQueryValues(response.url())} :: HTTP ${status} ${response.statusText()}`
      );
    }
  });

  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response, 'application navigation returned no response').not.toBeNull();
    expect(response?.ok(), 'application navigation was not successful').toBeTruthy();

    await expect(page.locator('body')).not.toBeEmpty();
    expect((await page.locator('body').innerText()).trim().length,
      'application document rendered no visible text').toBeGreaterThan(0);
    expect((await page.title()).trim(), 'document title is missing').not.toBe('');

    const healthPath = process.env.HEALTHCHECK_PATH ?? '/api/health';
    const health = await page.request.get(healthPath);
    expect(health.status(), `health endpoint returned HTTP ${health.status()}`).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok' });

    // Allow initial client-side fetches to settle before evaluating collected signals.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);

    expect(consoleErrors, `browser console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `uncaught browser errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(failedRequests, `failed browser requests:\n${failedRequests.join('\n')}`).toEqual([]);
    expect(badResponses, `critical HTTP responses:\n${badResponses.join('\n')}`).toEqual([]);
  } finally {
    // This attachment is intentionally written even when an assertion fails.
    await testInfo.attach('browser-diagnostics.json', {
      body: JSON.stringify({
        baseUrl: redactSensitiveQueryValues(base.toString()),
        checkedAt: new Date().toISOString(),
        consoleErrors,
        pageErrors,
        failedRequests,
        badResponses
      }, null, 2),
      contentType: 'application/json'
    });
  }
});
