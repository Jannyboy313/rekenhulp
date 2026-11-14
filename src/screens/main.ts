import '../app.css';
import { watchViewport } from '../components/layout.svelte';
import { SCENES } from './scenes';

declare global {
  interface Window {
    __sceneIds: string[];
  }
}

const target = document.getElementById('app');
if (!target) throw new Error('Mount point #app not found');

window.__sceneIds = Object.keys(SCENES);

// Most scenes mount a screen without App, which keeps the layout in the real app (v4 spec §3.2).
watchViewport(window, document.documentElement);

const id = location.hash.slice(1);
const scene = SCENES[id];
if (scene) scene(target);
else if (id) throw new Error(`Unknown scene: ${id}`);
