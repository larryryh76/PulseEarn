import { test } from '@playwright/test';

test('Diagnostic - Dump Task Data', async ({ page }) => {
  // Login as admin to see what's actually in the DB
  await page.goto('https://pulseearn.online/signin');
  await page.locator('input[type="email"]').fill('admin@pulse.com');
  await page.locator('input[type="password"]').fill('dereal01');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard');

  // Navigate to Quests as admin (who should see all active tasks)
  await page.goto('https://pulseearn.online/quests');
  await page.waitForTimeout(5000);

  const tasksData = await page.evaluate(async () => {
    // We can't easily access the TaskContext state from outside,
    // but we can check the DOM for task cards or hidden data
    const cards = Array.from(document.querySelectorAll('.task-card, [class*="TaskCard"]'));
    return cards.map(c => c.textContent);
  });

  console.log('Admin Quests View:', tasksData);

  // Check Campaign status via Admin Hub directly
  await page.goto('https://pulseearn.online/ops/dashboard');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'investigation/admin_tasks_list.png' });
});
