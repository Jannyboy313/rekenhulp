import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './app.css';
import App from './App.svelte';
import { openMemory } from './lib/memory';
import { createUpdates } from './lib/update';

const target = document.getElementById('app');
if (!target) throw new Error('Mount point #app not found');

// iOS Safari only applies :active to buttons when a touch listener exists (spec §6).
document.addEventListener('touchstart', () => {}, { passive: true });

// An installed PWA resumes from the background without a navigation, so the browser never checks
// for a new service worker. Check on every resume; a waiting version is offered to the user (spec §2).
const updates = createUpdates(() => void updateSW(true));
const updateSW = registerSW({
  onNeedRefresh: updates.needRefresh,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      updates.resume();
      void registration.update().catch(() => {});
    });
  },
});

// Without durable storage the browser may evict the records under pressure; a missing API or a
// refusal changes nothing (memory spec §3.4).
const memory = openMemory(globalThis.indexedDB, () => {
  void navigator.storage?.persist?.().catch(() => {});
});

mount(App, { target, props: { updates, memory } });
