import { test } from '@playwright/test';

test('Inspect Signup HTML', async ({ page }) => {
  await page.goto('https://pulseearn.online/signup');
  const html = await page.content();
  console.log(html);
});
