import { test, expect } from '@playwright/test';

test('verify landing page sections and app functionality', async ({ page }) => {
  // Go to the landing page
  await page.goto('http://localhost:5173');

  // Scroll through the page to trigger animations
  const sections = ['#features', '#rewards', '#predict', '#leaderboard', '#faq'];
  for (const selector of sections) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Wait for animation
    }
  }

  // Take a full page screenshot
  await page.screenshot({ path: '/home/jules/verification/screenshots/landing_full.png', fullPage: true });

  // Verify Hero
  await expect(page.locator('h1')).toContainText('EARN REWARDS');

  // Verify Predict Page
  await page.goto('http://localhost:5173/predict');
  await page.waitForTimeout(2000); // Wait for market data
  await page.screenshot({ path: '/home/jules/verification/screenshots/predict_page.png' });
  await expect(page.locator('h1')).toContainText('Execution Hub');

  // Verify Earn Page
  await page.goto('http://localhost:5173/earn');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/screenshots/earn_page.png' });
  await expect(page.locator('h1')).toContainText('Mission Terminal');
});
