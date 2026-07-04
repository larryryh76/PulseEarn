import { test, expect } from '@playwright/test';

test('User and Admin Deep Walkthrough', async ({ page }) => {
  // 1. Login as User
  await page.goto('https://pulseearn.online/signin');
  await page.fill('input[type="email"]', 'testuser_audit@gmail.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  console.log('--- USER WALKTHROUGH ---');

  // Dashboard Check
  console.log('Checking Dashboard...');
  await page.screenshot({ path: 'audit_user_dashboard.png' });

  // Tasks Check
  console.log('Checking Tasks...');
  await page.click('a[href="/tasks"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_user_tasks.png' });

  // Wallet Check
  console.log('Checking Wallet...');
  await page.click('a[href="/wallet"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_user_wallet.png' });

  // Predictions Check
  console.log('Checking Predictions...');
  await page.click('a[href="/prediction"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_user_predictions.png' });

  // Referrals Check
  console.log('Checking Referrals...');
  await page.click('a[href="/me"]'); // Referrals are usually in Profile or separate link
  // Based on screenshots, "ME" is the profile link
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_user_profile.png' });

  // Admin Walkthrough
  console.log('--- ADMIN WALKTHROUGH ---');
  await page.goto('https://pulseearn.online/ops/overview'); // Directly to admin overview
  await page.waitForTimeout(3000);

  const modules = ['users', 'tasks', 'predictions', 'withdrawals', 'economy', 'health', 'fraud', 'support'];
  for (const mod of modules) {
    console.log(`Checking Admin Module: ${mod}`);
    await page.goto(`https://pulseearn.online/ops/${mod}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `audit_admin_${mod}.png` });
  }
});
