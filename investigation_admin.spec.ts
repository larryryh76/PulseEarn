import { test, expect } from '@playwright/test';

test('Admin Walkthrough Logic Trace', async ({ page }) => {
  // We can't easily log in as admin without a real session,
  // but we can check the AdminRoute and OpsLayout logic.

  await page.goto('http://localhost:5173/admin');
  // It should redirect to /login if not authenticated
  await page.waitForURL(/.*login/);
  console.log('Admin route protected as expected.');

  await page.screenshot({ path: 'investigation/admin_protection.png' });
});
