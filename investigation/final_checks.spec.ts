
import { test, expect } from '@playwright/test';

test('Phase 7: Route Protection Check', async ({ page }) => {
    // 1. Create a fresh user
    const email = `test_security_${Date.now()}@pulse.com`;
    await page.goto('https://pulseearn.online/signup');
    await page.fill('input[placeholder="name@example.com"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("CREATE ACCOUNT")');
    await page.waitForURL('**/dashboard');

    // 2. Try to access Admin Hub directly
    await page.goto('https://pulseearn.online/ops/overview');

    // 3. Verify redirection or access denied
    // Based on codebase, OpsLayout should redirect if not admin
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`URL after admin access attempt: ${url}`);

    if (url.includes('/ops/')) {
        console.error('SECURITY FAILURE: Non-admin accessed Admin Hub');
    } else {
        console.log('SECURITY PASS: Route protection active');
    }
});

test('Phase 4: Data Consistency - Stale Missions', async ({ page }) => {
    // Check if any deleted or inactive missions are rendered
    // This is hard without DB access, but I can check for duplicates or "test" data
    await page.goto('https://pulseearn.online/login');
    // Login as admin to see all
    await page.fill('input[placeholder="name@example.com"]', 'admin@pulse.com');
    await page.fill('input[type="password"]', 'dereal01');
    await page.click('button:has-text("SIGN IN")');
    await page.waitForURL('**/dashboard');

    await page.goto('https://pulseearn.online/tasks');
    const tasks = await page.locator('.card').allInnerTexts();
    console.log('Visible Tasks:', tasks);

    await page.goto('https://pulseearn.online/ops/tasks');
    // Compare UI count with admin count
});
