import { defineConfig } from '@playwright/test';

const port = 5199;

// One project per layout of the v4 spec (§3.1); the PNGs land in screenshots/<project>/. The
// tablets render at 1 image px per CSS px, like the designer's mock-ups.
export default defineConfig({
  testDir: 'screenshots',
  outputDir: 'test-results',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: 'chromium',
    reducedMotion: 'reduce',
    locale: 'nl-NL',
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 } },
    { name: 'tablet-landscape', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet-portrait', use: { viewport: { width: 800, height: 1280 } } },
    // An 8" tablet in landscape: only the play screen has compact sizes.
    { name: 'compact', use: { viewport: { width: 960, height: 552 } }, grep: /question-/ },
  ],
  webServer: {
    command: `vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/screens.html`,
    reuseExistingServer: false,
  },
});
