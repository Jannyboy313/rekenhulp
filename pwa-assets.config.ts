import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// The source is full-bleed with its symbols inside the 80 % safe zone, so the maskable and apple
// icons use it as it is: padding it would show an inner square inside Android's round mask.
const preset = {
  ...minimal2023Preset,
  maskable: { ...minimal2023Preset.maskable, padding: 0 },
  apple: { ...minimal2023Preset.apple, padding: 0 },
};

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/icon.svg'],
});
