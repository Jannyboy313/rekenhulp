import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Mount point #app not found');

// iOS Safari only applies :active to buttons when a touch listener exists (spec §6).
document.addEventListener('touchstart', () => {}, { passive: true });

mount(App, { target });
