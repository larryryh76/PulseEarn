import { test, expect } from '@playwright/test';

test.describe('PulseEarn Comprehensive Production Certification', () => {
  const SITE_URL = 'https://pulseearn.online';
  const ADMIN_EMAIL = 'admin@pulse.com';
  const ADMIN_PASS = 'dereal01';

  test('Full System Audit - Admin & Moderator', async ({ page }) => {
    console.log('--- ADMIN WORKFLOW AUDIT ---');
    await page.goto(`${SITE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=OVERVIEW', { timeout: 20000 });

    // 1. Economy Metrics
    const liability = await page.locator('text=USD Liability').locator('..').locator('p').nth(1).textContent();
    console.log(`[Economy] USD Liability: ${liability}`);

    // 2. User Management & Moderator Promotion
    await page.click('text=USER DIRECTORY');
    await page.waitForSelector('table tr');
    console.log('[Users] Directory loaded.');

    // Select first user and attempt actions
    await page.locator('table tr').nth(1).click();
    await page.screenshot({ path: 'investigation/audit_admin_user_detail.png' });

    // 3. Campaign & Task Management
    await page.click('text=TASK LIBRARY');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_admin_tasks.png' });

    // 4. Offerwall Management
    await page.click('text=OFFERWALLS');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_admin_offerwalls.png' });

    // 5. Audit Logs
    await page.click('text=AUDIT LOGS');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_admin_logs.png' });
  });

  test('Full System Audit - User E2E', async ({ page }) => {
    console.log('--- USER WORKFLOW AUDIT ---');
    const testUser = `audit_final_${Date.now()}`;
    const testEmail = `${testUser}@yopmail.com`;

    await page.goto(`${SITE_URL}/signup`);
    await page.fill('input[name="username"]', testUser);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 20000 });
    console.log('[Signup] Success.');

    // 1. Profile & Avatar
    await page.goto(`${SITE_URL}/me`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'investigation/audit_user_profile.png' });

    // 2. Daily Reward
    await page.goto(`${SITE_URL}/dashboard`);
    const dailyBtn = page.locator('button:has-text("Claim")');
    if (await dailyBtn.isVisible()) {
        console.log('[DailyReward] Attempting claim...');
        await dailyBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'investigation/audit_user_daily_claim.png' });
    }

    // 3. Predictions
    await page.goto(`${SITE_URL}/predictions`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_user_predictions.png' });

    // 4. Wallet & Withdrawal
    await page.goto(`${SITE_URL}/wallet`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_user_wallet.png' });

    // 5. Notifications
    await page.goto(`${SITE_URL}/notifications`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/audit_user_notifications.png' });
  });

  test('Mobile Responsiveness Check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${SITE_URL}`);
    await page.screenshot({ path: 'investigation/audit_mobile_landing.png' });

    await page.goto(`${SITE_URL}/login`);
    await page.screenshot({ path: 'investigation/audit_mobile_login.png' });
  });
});
