import { test, expect } from '@playwright/test';

test.describe('PulseEarn Production Audit V2', () => {
  const SITE_URL = 'https://pulseearn.online';

  test('Admin Full Workflow', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log('HTTP ERROR:', response.status(), response.url());
        }
    });

    console.log('--- Admin Login Audit ---');
    await page.goto(`${SITE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@pulse.com');
    await page.fill('input[type="password"]', 'dereal01');
    await page.click('button[type="submit"]');

    // Wait for the overview to appear
    await page.waitForSelector('text=OVERVIEW', { timeout: 20000 });
    console.log('PASS: Admin login successful and reached Overview.');
    await page.screenshot({ path: 'investigation/admin_01_overview.png' });

    // Verify "CRITICAL: LIABILITY REPORTING OFFLINE" seen in previous screenshot
    const liabilityOffline = page.locator('text=CRITICAL: LIABILITY REPORTING OFFLINE');
    if (await liabilityOffline.isVisible()) {
        console.log('FAIL: Liability reporting is OFFLINE in production.');
    }

    // Test Navigation to Users
    console.log('--- Testing Ops Users ---');
    await page.click('text=USER DIRECTORY'); // From screenshot, it seems to be in sidebar
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/admin_02_users.png' });

    // Check if users are loaded
    const userRows = page.locator('table tr');
    const count = await userRows.count();
    console.log(`Found ${count} user rows.`);
    if (count <= 1) {
        console.log('FAIL: User directory seems empty or failed to load data.');
    }

    // Test Navigation to Tasks
    console.log('--- Testing Ops Tasks ---');
    await page.click('text=TASK LIBRARY');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/admin_03_tasks.png' });

    // Logout
    console.log('--- Testing Logout ---');
    await page.click('text=Logout'); // Assuming there's a logout button
    await page.waitForURL(`${SITE_URL}/login`);
    console.log('PASS: Logout successful.');
  });

  test('User Signup & E2E Workflow', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    console.log('--- User Signup Audit ---');
    await page.goto(`${SITE_URL}/signup`);

    // The previous failure suggested 'input[placeholder*="Username"]' might be wrong.
    // Let's inspect the page content or use a more generic selector.
    const usernameInput = page.locator('input[name="username"], input[placeholder*="Username"], input[placeholder*="Name"]');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    const testEmail = `audit_user_${Date.now()}@yopmail.com`;
    const testUsername = `audit${Math.floor(Math.random() * 1000)}`;

    await usernameInput.first().fill(testUsername);
    await emailInput.fill(testEmail);
    await passwordInput.fill('Password123!');
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/.*verify-email/, { timeout: 15000 });
      console.log('PASS: User registration successful, reached Verify Email.');
      await page.screenshot({ path: 'investigation/user_04_verify_email.png' });

      // Check for Resend Email trigger
      const resendButton = page.locator('button:has-text("Resend")');
      if (await resendButton.isVisible()) {
          console.log('Testing Resend Email button...');
          await resendButton.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'investigation/user_05_resend_clicked.png' });
      }

    } catch (e) {
      console.log('FAIL: User signup or verify-email redirect failed.');
      await page.screenshot({ path: 'investigation/user_signup_failure_v2.png' });
    }
  });
});
