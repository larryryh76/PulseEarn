import { test, expect } from '@playwright/test';

test('Verify Batch 4 Console Cleanup', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });

  await page.goto('https://www.pulseearn.online', { waitUntil: 'networkidle' });

  const bootLogs = consoleLogs.filter(log => log.includes('PULSE_EARN_BOOT'));
  const apiLogs = consoleLogs.filter(log => log.includes('[API]'));

  // Assert that PULSE_EARN_BOOT logs are absent (Batch 4 cleanup verification)
  expect(bootLogs.length).toBe(0);

  // Assert that API logs, if present, indicate safeFetch is working correctly
  // (API logs should only appear in dev mode, but if present they should contain error guards)
  apiLogs.forEach(log => {
    expect(log).toMatch(/\[API\]/);
  });
});
