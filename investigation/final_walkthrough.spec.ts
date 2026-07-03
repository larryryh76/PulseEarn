import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('Full System Walkthrough', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  console.log('--- Auth Flow ---');
  await page.goto('https://www.pulseearn.online/login', { waitUntil: 'load' });
  await page.fill('input[type="email"]', 'admin@pulse.com');
  await page.fill('input[type="password"]', 'dereal01');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(10000);

  console.log('--- Tasks Audit ---');
  await page.goto('https://www.pulseearn.online/tasks', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/audit_tasks.png', fullPage: true });

  console.log('--- Wallet Audit ---');
  await page.goto('https://www.pulseearn.online/wallet', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/audit_wallet.png', fullPage: true });

  console.log('--- Referral Audit ---');
  await page.goto('https://www.pulseearn.online/referrals', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/audit_referrals.png', fullPage: true });

  console.log('--- Admin Audit ---');
  await page.goto('https://www.pulseearn.online/admin/overview', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/audit_admin.png', fullPage: true });

  console.log('--- API Final Ping ---');
  const pingRes = await page.request.get('https://www.pulseearn.online/api/ping');
  console.log('Ping Result:', await pingRes.json());

  const healthRes = await page.request.get('https://www.pulseearn.online/api/health');
  console.log('Health Result:', await healthRes.json());

  console.log('--- Console Errors ---');
  consoleLogs.filter(l => l.includes('error')).forEach(e => console.log('BROWSER ERROR:', e));
});
