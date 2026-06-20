import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

export default defineConfig({
  test: {
    globals: true,
    include: ['./test/unit/**/*.js'],
    browser: {
      enabled: true,
      provider: webdriverio({
        capabilities: {
          'goog:chromeOptions': {
            args: [
              '--headless=new',
              '--no-sandbox'
            ]
          }
        }
      }),
      instances: [
        { browser: 'chrome' }
      ],
      screenshotFailures: false
    }
  },
});
