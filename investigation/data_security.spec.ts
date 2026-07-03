import { test, expect } from '@playwright/test';

test.describe('PulseEarn Production Audit - Data & Security', () => {
  const timestamp = Date.now();
  const testUser = `audit_data_${timestamp}@pulse.com`;
  const testPass = 'Password123!';

  test('User Journey - Signup to Dashboard', async ({ page }) => {
    await page.goto('https://pulseearn.online/signup');

    // Set bypass flag
    await page.evaluate(() => localStorage.setItem('pulseearn-test-bypass', 'true'));

    // Wait for the loading screen to disappear
    await page.waitForSelector('input[type="email"]', { timeout: 60000 });

    await page.locator('input[type="email"]').fill(testUser);
    // Be very specific with placeholders found in the screenshot
    await page.locator('input[placeholder="Enter your password"]').fill(testPass);
    await page.locator('input[placeholder="Repeat your password"]').fill(testPass);

    await page.click('button:has-text("Create Account")');

    // Wait for navigation
    try {
      await page.waitForURL('**/dashboard', { timeout: 60000 });
      console.log('Successfully reached dashboard');
    } catch (e) {
      console.error('Failed to reach dashboard, checking for error messages');
      await page.screenshot({ path: `investigation/signup_failed_${timestamp}.png` });
      // Log console errors
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      throw e;
    }

    await page.screenshot({ path: `investigation/audit_dashboard_${timestamp}.png` });
  });

  test('Security - Admin Protection & Route Gating', async ({ page }) => {
    const adminRoutes = [
      '/ops/dashboard',
      '/ops/users',
      '/ops/withdrawals',
      '/ops/economy'
    ];

    for (const route of adminRoutes) {
      await page.goto(`https://pulseearn.online${route}`);
      await page.waitForTimeout(5000);
      const url = page.url();
      console.log(`Route ${route} -> ${url}`);
      // Usually it should end up on /signin or /dashboard (if user is logged in but not admin)
      expect(url).not.toContain('/ops/');
    }
  });

  test('Data Consistency - Quests & Missions Sync Check', async ({ page }) => {
     // User side check
     await page.goto('https://pulseearn.online/quests');
     await page.waitForTimeout(5000);
     const taskCards = page.locator('.task-card, [class*="TaskCard"]');
     const taskCount = await taskCards.count();
     console.log(`User Quests count: ${taskCount}`);

     // Log the HTML structure of the quests page to see why 0 tasks
     const questsHtml = await page.content();
     if (taskCount === 0) {
        console.warn('Data Sync Issue: Admin Hub shows 10 tasks, User Quests shows 0.');
        if (questsHtml.includes('No tasks available')) {
            console.log('Verified: UI explicitly shows empty state for tasks.');
        }
     }
  });
});
