import { test, expect } from './fixtures';

test('Extension UI loads without console errors', async ({ page, extensionId }) => {
  // Capture unhandled exceptions and console errors
  const errors: string[] = [];
  page.on('pageerror', exception => {
    errors.push(`Page Error: ${exception}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  // Navigate to the popup
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Wait for the main UI to render (the header should be visible)
  await expect(page.locator('text=EdgeTask')).toBeVisible();

  // Simple smoke test: interact with the app to trigger potential errors
  
  // 1. Click settings button
  await page.locator('button[title="Settings (s)"]').click();
  await expect(page.locator('text=Settings')).toBeVisible();
  
  // Close settings
  await page.keyboard.press('Escape');

  // 2. Click Stats button
  await page.locator('button[title="View Stats (v)"]').click();
  await expect(page.locator('text=Your Stats')).toBeVisible();
  await page.keyboard.press('Escape');

  // 3. Click Deep Work button
  await page.locator('button[title="Deep Work Mode (d)"]').click();
  await expect(page.locator('text=Deep Work')).toBeVisible();
  await page.keyboard.press('Escape');

  // If there are any console errors captured, fail the test and print them
  if (errors.length > 0) {
    console.error('Captured errors during UI interaction:', errors);
  }
  expect(errors).toHaveLength(0);
});