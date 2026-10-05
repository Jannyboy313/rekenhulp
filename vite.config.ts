/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const isTest = process.env.VITEST !== undefined;

const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  pwaAssets: { config: true, overrideManifestIcons: true, includeHtmlHeadLinks: true },
  manifest: {
    name: 'Rekenhulp',
    short_name: 'Rekenhulp',
    description: 'Oefen hoofdrekenen zonder rekenmachine',
    lang: 'nl',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1d4ed8',
    background_color: '#f8fafc',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
  },
});

export default defineConfig({
  // Relative base so the static build can be hosted in any (sub)folder.
  base: './',
  plugins: [svelte(), ...(isTest ? [svelteTesting()] : [pwa])],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
