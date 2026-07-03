import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Capture Screenshots and Logs', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('429') && !text.includes('CoinGecko')) {
       consoleLogs.push(`[${msg.type()}] ${text}`);
    }
  });

  console.log('--- Landing Page ---');
  await page.goto('https://www.pulseearn.online', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'investigation/retest_01_landing.png', fullPage: true });

  console.log('--- Login Page ---');
  await page.goto('https://www.pulseearn.online/login', { waitUntil: 'load' });
  await page.fill('input[type="email"]', 'admin@pulse.com');
  await page.fill('input[type="password"]', 'dereal01');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'investigation/retest_02_login_done.png' });

  // CHECK IF DASHBOARD ACCESSIBLE
  console.log('--- Dashboard ---');
  await page.goto('https://www.pulseearn.online/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  const bodyText = await page.textContent('body');
  console.log('Dashboard Content Sample:', bodyText?.slice(0, 200));
  await page.screenshot({ path: 'investigation/retest_03_dashboard.png', fullPage: true });

  console.log('--- Admin Overview ---');
  await page.goto('https://www.pulseearn.online/admin/overview', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/retest_04_admin.png', fullPage: true });

  console.log('--- Console Audit ---');
  consoleLogs.forEach(log => console.log('BROWSER:', log));
});
