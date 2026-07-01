import { test, expect } from '@playwright/test';

test.describe('PulseEarn Production Audit V3', () => {
  const SITE_URL = 'https://pulseearn.online';

  test('Admin Deep Audit', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    console.log('--- Admin Login ---');
    await page.goto(`${SITE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@pulse.com');
    await page.fill('input[type="password"]', 'dereal01');
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=OVERVIEW', { timeout: 20000 });
    console.log('PASS: Admin login successful.');

    // Check Liability Value
    const liabilityText = await page.locator('p:near(p:text("USD Liability"))').first().textContent();
    console.log(`USD Liability Value: ${liabilityText}`);

    // Check for "CRITICAL: LIABILITY REPORTING OFFLINE"
    const offlineWarning = page.locator('text=CRITICAL: LIABILITY REPORTING OFFLINE');
    if (await offlineWarning.isVisible()) {
        console.log('FAIL: Liability reporting is OFFLINE (value is 0 or doc missing).');
    } else {
        console.log('PASS: Liability reporting is ONLINE.');
    }

    // Go to User Directory and verify data
    await page.click('text=USER DIRECTORY');
    await page.waitForSelector('table tr', { timeout: 10000 });
    const userRows = await page.locator('table tr').count();
    console.log(`Found ${userRows} users in directory.`);

    // Go to Validation and check for pending claims
    await page.click('text=APPROVALS'); // From sidebar in screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/admin_04_approvals.png' });
    console.log('Navigated to Approvals.');

    // Go to Economy Hub
    await page.click('text=ECONOMY HUB');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'investigation/admin_05_economy.png' });
    console.log('Navigated to Economy Hub.');
  });

  test('User Signup and Flow', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    console.log('--- User Signup ---');
    await page.goto(`${SITE_URL}/signup`);

    const testUsername = `audit_${Math.floor(Math.random() * 10000)}`;
    const testEmail = `${testUsername}@yopmail.com`;

    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="email"]', testEmail);
    // There are two password fields: 'password' and 'confirmPassword'
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    await page.click('button[type="submit"]');

    // Expected: redirect to /guide or /verify-email
    try {
        await page.waitForURL(/.*(guide|verify-email|dashboard)/, { timeout: 20000 });
        console.log(`PASS: User registered and redirected to ${page.url()}`);
        await page.screenshot({ path: 'investigation/user_06_post_signup.png' });

        if (page.url().includes('verify-email')) {
            console.log('Checking for Resend functionality...');
            const resendBtn = page.locator('button:has-text("Resend")');
            if (await resendBtn.isVisible()) {
                await resendBtn.click();
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'investigation/user_07_resend_clicked.png' });
                console.log('Resend clicked.');
            }
        }
    } catch (e) {
        console.log('FAIL: Signup failed or timed out.');
        await page.screenshot({ path: 'investigation/user_signup_failure_v3.png' });
        const toast = await page.locator('.hot-toast-message').textContent().catch(() => 'No toast');
        console.log(`Toast message: ${toast}`);
    }
  });
});
