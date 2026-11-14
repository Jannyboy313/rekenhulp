import '../app.css';
import { SCENES } from './scenes';

declare global {
  interface Window {
    __sceneIds: string[];
  }
}

const target = document.getElementById('app');
if (!target) throw new Error('Mount point #app not found');

window.__sceneIds = Object.keys(SCENES);

const id = location.hash.slice(1);
const scene = SCENES[id];
if (scene) scene(target);
else if (id) throw new Error(`Unknown scene: ${id}`);
