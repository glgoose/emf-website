import { expect, test } from '@playwright/test';

test('activiteiten detail: desktop visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.goto('/activiteiten/boekvoorstelling-inleiding-tot-het-marxisme', { waitUntil: 'networkidle' });
  await expect(page).toHaveScreenshot('activiteiten-detail-desktop.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('activiteiten detail: tablet visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1600 });
  await page.goto('/activiteiten/boekvoorstelling-inleiding-tot-het-marxisme', { waitUntil: 'networkidle' });
  await expect(page).toHaveScreenshot('activiteiten-detail-tablet.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
