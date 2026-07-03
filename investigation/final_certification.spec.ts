import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('Final Certification Walkthrough', async ({ page }) => {
  const responses: any[] = [];
  const consoleLogs: any[] = [];

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      ok: response.ok()
    });
  });

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  console.log('--- Phase 1: Authentication ---');
  await page.goto('https://www.pulseearn.online/login');

  await page.fill('input[type="email"]', 'admin@pulse.com');
  await page.fill('input[type="password"]', 'dereal01');
  await page.click('button:has-text("Sign In")');

  // Wait for auth state
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/cert_01_login.png' });

  console.log('--- Phase 2: Dashboard ---');
  await page.goto('https://www.pulseearn.online/dashboard');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/cert_02_dashboard.png', fullPage: true });

  console.log('--- Phase 3: Admin Overview ---');
  await page.goto('https://www.pulseearn.online/admin/overview');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/cert_03_admin.png', fullPage: true });

  console.log('--- Phase 4: API Verification ---');
  const healthRes = await page.request.get('https://www.pulseearn.online/api/health');
  const health = await healthRes.json();
  console.log('Health:', health);

  const pingRes = await page.request.get('https://www.pulseearn.online/api/ping');
  const ping = await pingRes.json();
  console.log('Ping:', ping);

  expect(ping.success).toBe(true);
});
