import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../.output/chrome-mv3');
    const userDataDir = path.join(__dirname, '../.test-user-data');
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  
  extensionId: async ({ context }, use) => {
    // For manifest v3, we need to wait for the background page/service worker.
    // However, sometimes it starts so fast that waitForEvent hangs.
    let [background] = context.serviceWorkers();
    
    if (!background) {
      // If not already running, wait for it
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;