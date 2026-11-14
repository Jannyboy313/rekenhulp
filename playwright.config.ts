import { defineConfig } from '@playwright/test';

const port = 5199;

export default defineConfig({
  testDir: 'screenshots',
  outputDir: 'test-results',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: 'chromium',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    reducedMotion: 'reduce',
    locale: 'nl-NL',
  },
  webServer: {
    command: `vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/screens.html`,
    reuseExistingServer: false,
  },
});
