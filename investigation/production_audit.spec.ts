import { test, expect } from '@playwright/test';

test.describe('PulseEarn Production Audit', () => {
  const SITE_URL = 'https://pulseearn.online';

  test('Admin Login & Ops Hub Discovery', async ({ page }) => {
    console.log('--- Admin Login Audit ---');
    await page.goto(`${SITE_URL}/login`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Attempt Login
    await page.fill('input[type="email"]', 'admin@pulse.com');
    await page.fill('input[type="password"]', 'dereal01');
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    try {
      await page.waitForURL(`${SITE_URL}/admin`, { timeout: 10000 });
      console.log('PASS: Admin login successful.');
      await page.screenshot({ path: 'investigation/admin_logged_in.png' });

      // Verify Ops Hub Sidebar
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();
      console.log('PASS: Ops Hub Sidebar visible.');

      // Try navigating to a few modules
      const modules = ['Users', 'Tasks', 'Economy', 'Validation'];
      for (const mod of modules) {
        await page.click(`text=${mod}`);
        await page.waitForTimeout(1000); // Wait for transition
        console.log(`Navigated to Ops ${mod}`);
        await page.screenshot({ path: `investigation/admin_ops_${mod.toLowerCase()}.png` });
      }

    } catch (e) {
      console.log('FAIL: Admin login failed or timed out.');
      await page.screenshot({ path: 'investigation/admin_login_failure.png' });

      // Check for error toast or message
      const errorMsg = await page.textContent('.toast, [role="alert"]');
      if (errorMsg) console.log(`Error Message: ${errorMsg}`);
    }
  });

  test('User Registration & Welcome Flow', async ({ page }) => {
    console.log('--- User Registration Audit ---');
    await page.goto(`${SITE_URL}/signup`);
    await page.waitForLoadState('networkidle');

    const testEmail = `audit_user_${Date.now()}@yopmail.com`;
    const testUsername = `audit_${Math.floor(Math.random() * 10000)}`;

    await page.fill('input[placeholder*="Username"]', testUsername);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    try {
      // Should redirect to verify-email or dashboard
      await page.waitForURL(/.*(verify-email|dashboard|me)/, { timeout: 15000 });
      console.log('PASS: User registration successful.');
      await page.screenshot({ path: 'investigation/user_registered.png' });

      // Check for welcome bonus
      await page.goto(`${SITE_URL}/me`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'investigation/user_profile_initial.png' });

    } catch (e) {
      console.log('FAIL: User registration failed or timed out.');
      await page.screenshot({ path: 'investigation/user_signup_failure.png' });
      const errorMsg = await page.textContent('.toast, [role="alert"]');
      if (errorMsg) console.log(`Error Message: ${errorMsg}`);
    }
  });
});
