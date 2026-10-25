import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Maskable and apple icons get a padded safe zone; fill it with the brand colour instead of
// the default white so the icon does not look like a small square on a white tile.
const preset = {
  ...minimal2023Preset,
  maskable: {
    ...minimal2023Preset.maskable,
    resizeOptions: { background: '#5B3FD1' },
  },
  apple: {
    ...minimal2023Preset.apple,
    resizeOptions: { background: '#5B3FD1' },
  },
};

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/icon.svg'],
});
