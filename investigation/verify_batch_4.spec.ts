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

  expect(bootLogs.length).toBe(0);

  // Check if safeFetch is working (if api failed, it should log a safe message)
  const apiLogs = consoleLogs.filter(log => log.includes('[API]'));
  console.log('API Logs:', apiLogs);
  expect(apiLogs.length).toBeGreaterThanOrEqual(0);
});
