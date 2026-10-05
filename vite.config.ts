/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';

const isTest = process.env.VITEST !== undefined;

export default defineConfig({
  // Relative base so the static build can be hosted in any (sub)folder.
  base: './',
  plugins: [svelte(), ...(isTest ? [svelteTesting()] : [])],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
