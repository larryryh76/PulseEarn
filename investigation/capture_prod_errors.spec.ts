import { test, expect } from '@playwright/test';

test('Capture Production Errors', async ({ page }) => {
  const responses: any[] = [];
  const consoleLogs: any[] = [];

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers()
    });
  });

  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  await page.goto('https://www.pulseearn.online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Wait for potential async errors

  console.log('--- Network Responses ---');
  responses.forEach(r => {
    if (r.status >= 400) {
      console.log(`URL: ${r.url} | Status: ${r.status} ${r.statusText}`);
    }
  });

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => {
    if (l.type === 'error') {
      console.log(`[${l.type.toUpperCase()}] ${l.text}`);
    }
  });

  await page.screenshot({ path: 'investigation/prod_error_capture.png', fullPage: true });
});
