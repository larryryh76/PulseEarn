import { test, expect } from '@playwright/test';

test('Evidence - Task Sync Failure', async ({ page }) => {
  // 1. Admin Evidence: Confirm tasks exist in Admin Hub
  await page.goto('https://pulseearn.online/signin');
  await page.waitForSelector('input[type="email"]');
  await page.locator('input[type="email"]').fill('admin@pulse.com');
  await page.locator('input[type="password"]').fill('dereal01');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard');

  await page.goto('https://pulseearn.online/ops/dashboard');
  await page.waitForTimeout(5000);

  // Scrape Task Count from Admin Overview
  const adminTaskCount = await page.evaluate(() => {
    const stats = Array.from(document.querySelectorAll('.stat-value, [class*="StatValue"]'));
    // Usually one of these is 'Active Tasks'
    return stats.map(s => s.textContent);
  });
  console.log('Admin Stat Values:', adminTaskCount);
  await page.screenshot({ path: 'investigation/evidence_admin_stats.png' });

  // 2. User Evidence: Confirm 0 tasks visible to a fresh user
  const timestamp = Date.now();
  const testUser = `audit_sync_${timestamp}@pulse.com`;
  await page.goto('https://pulseearn.online/signup');
  await page.evaluate(() => localStorage.setItem('pulseearn-test-bypass', 'true'));
  await page.waitForSelector('input[type="email"]');
  await page.locator('input[type="email"]').fill(testUser);
  await page.locator('input[placeholder="Enter your password"]').fill('Password123!');
  await page.locator('input[placeholder="Repeat your password"]').fill('Password123!');
  await page.click('button:has-text("Create Account")');

  await page.waitForURL('**/dashboard', { timeout: 60000 });
  await page.goto('https://pulseearn.online/quests');
  await page.waitForTimeout(5000);

  const userTasksHtml = await page.content();
  const userTaskCards = await page.locator('.task-card, [class*="TaskCard"]').count();

  console.log(`User Quests Card Count: ${userTaskCards}`);
  await page.screenshot({ path: 'investigation/evidence_user_quests.png' });

  // 3. Trace Root Cause in Code
  // TaskContext.tsx Line 166:
  // const filteredTasks = tasks.filter(t => {
  //   if (t.campaignId) {
  //     const campaign = campaigns.find(c => c.id === t.campaignId);
  //     if (!campaign || !campaign.active) return false;
  //   }
  //   ...
  // });

  // Hypothesis: Tasks are active but their associated campaigns are NOT active or don't exist.
});
