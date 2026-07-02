import { test, expect } from '@playwright/test';

test('Production Health and Connectivity Audit', async ({ page }) => {
  const responses: any[] = [];
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      ok: response.ok()
    });
  });

  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  console.log('Navigating to https://www.pulseearn.online');
  await page.goto('https://www.pulseearn.online', { waitUntil: 'networkidle' });

  await page.screenshot({ path: 'investigation/prod_01_landing.png', fullPage: true });
  console.log('Captured landing page screenshot.');

  // Check for 500 errors in network
  const apiFailures = responses.filter(r => r.url.includes('/api/') && r.status === 500);
  if (apiFailures.length > 0) {
    console.error('CRITICAL: API 500 Errors detected:', apiFailures);
  }

  // Log all errors
  if (errors.length > 0) {
    console.error('Browser Console Errors:', errors);
  }

  // Try navigating to login
  await page.goto('https://www.pulseearn.online/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'investigation/prod_02_login.png' });

  console.log('Audit completed.');
});
