import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

const chromeOptions = {
  capabilities: {
    'goog:chromeOptions': {
      args: [
        '--headless=new',
        '--no-sandbox'
      ]
    }
  }
};

export default defineConfig({
  test: {
    projects: [
      // ── Unit tests ────────────────────────────────────────────────────────
      {
        test: {
          name: 'unit-tests',
          globals: true,
          publicDir: './test',
          include: ['./test/unit/**/*.js'],
          browser: {
            enabled: true,
            provider: webdriverio(chromeOptions),
            instances: [{ browser: 'chrome' }],
            screenshotFailures: false
          }
        }
      },

      // ── Visual acceptance tests ───────────────────────────────────────────
      {
        test: {
          name: 'visual-tests',
          globals: true,
          publicDir: './test',
          include: ['./test/visual/cases/**/*.js'],
          exclude: ['./test/visual/visualTest.js'],
          testTimeout: 15000,
          browser: {
            enabled: true,
            provider: webdriverio(chromeOptions),
            instances: [{ browser: 'chrome' }],
            screenshotFailures: false
          }
        }
      }
    ]
  }
});
