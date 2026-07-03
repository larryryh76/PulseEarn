import { test, expect } from '@playwright/test';

test('Verify Batch 4 Console Cleanup', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });

  await page.goto('https://www.pulseearn.online', { waitUntil: 'networkidle' });

  const bootLogs = consoleLogs.filter(log => log.includes('PULSE_EARN_BOOT'));
  console.log('--- Console Logs Found ---');
  consoleLogs.forEach(l => console.log('LOG:', l));

  if (bootLogs.length === 0) {
    console.log('SUCCESS: PULSE_EARN_BOOT logs are hidden (Batch 4 confirmed).');
  } else {
    console.log('FAILURE: PULSE_EARN_BOOT logs are still visible.');
  }

  // Check if safeFetch is working (if api failed, it should log a safe message)
  const apiLogs = consoleLogs.filter(log => log.includes('[API]'));
  console.log('API Logs:', apiLogs);
});
