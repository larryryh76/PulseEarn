import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Dashboard Data Integrity Audit', async ({ page }) => {
  await page.goto('https://www.pulseearn.online/login');
  await page.fill('input[type="email"]', 'admin@pulse.com');
  await page.fill('input[type="password"]', 'dereal01');
  await page.click('button:has-text("Sign In")');

  await page.waitForTimeout(15000);

  // Instead of complex selectors, just capture all h1, h2
  const h1s = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(h => h.textContent));
  const h2s = await page.evaluate(() => Array.from(document.querySelectorAll('h2')).map(h => h.textContent));

  console.log('H1 elements:', h1s);
  console.log('H2 elements:', h2s);

  // Check for authority failure text
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('Authority Sync Failed')) {
     console.log('FAILURE: UI reports ENTITY_READ_FAILURE');
  } else if (bodyText.includes('Welcome back')) {
     console.log('SUCCESS: Dashboard loaded');
  } else {
     console.log('UNCERTAIN: Body contains:', bodyText.slice(0, 500));
  }
});
