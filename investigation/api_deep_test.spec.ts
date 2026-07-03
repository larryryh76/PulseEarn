import { test, expect } from '@playwright/test';

test('API Force Database Init', async ({ page }) => {
  await page.goto('https://www.pulseearn.online/login');
  await page.fill('input[type="email"]', 'admin@pulse.com');
  await page.fill('input[type="password"]', 'dereal01');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(10000);

  // Monitor network for outgoing API calls to catch the token
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/')),
    page.goto('https://www.pulseearn.online/admin/overview')
  ]);

  const authHeader = request.headers()['authorization'];
  console.log('Auth Header Present:', !!authHeader);

  if (authHeader) {
     const healthRes = await page.request.get('https://www.pulseearn.online/api/health', {
        headers: { 'Authorization': authHeader }
     });
     const health = await healthRes.json();
     console.log('Health with Auth:', health);
  }
});
