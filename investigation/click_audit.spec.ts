import { test, expect } from '@playwright/test';

test('clickability and route audit', async ({ page }) => {
  // 1. Landing Page Links
  await page.goto('http://localhost:5173/');

  const footerLinks = [
    '/privacy', '/terms', '/cookies', '/reward-policy',
    '/fraud-policy', '/verification-policy', '/withdrawal-policy',
    '/referral-policy', '/community-guidelines', '/support-policy', '/help'
  ];

  for (const link of footerLinks) {
    console.log(`Checking link: ${link}`);
    const href = await page.getAttribute(`a[href="${link}"]`, 'href');
    if (href) {
        await page.click(`a[href="${link}"]`);
        await expect(page).not.toHaveURL(/.*404.*/);
        await page.goto('http://localhost:5173/');
    } else {
        console.warn(`Link not found in footer: ${link}`);
    }
  }

  // 2. Auth CTAs
  const ctas = ['Get Started', 'Sign In', 'Sign Up'];
  for (const cta of ctas) {
    const btn = page.getByText(cta, { exact: true }).first();
    if (await btn.isVisible()) {
        console.log(`Checking CTA: ${cta}`);
        await btn.click();
        await expect(page.url()).toMatch(/\/(signup|login|dashboard)/);
        await page.goto('http://localhost:5173/');
    }
  }
});
