import { defineConfig } from '@playwright/test';

const port = 5198;

// `npm run smoke`: the built app in dist/, served by `vite preview`, so the service worker runs.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: 'chromium',
    viewport: { width: 360, height: 780 },
    locale: 'nl-NL',
  },
  webServer: {
    command: `vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
