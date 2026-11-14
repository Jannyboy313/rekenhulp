// Runs after `vite build`: the service worker rules in CLAUDE.md ("PWA pitfalls"). A violation
// breaks offline mode or the update prompt, and shows up only on a phone.
import { existsSync, readFileSync } from 'node:fs';

const sw = readFileSync('dist/sw.js', 'utf8');
const count = (pattern) => (sw.match(pattern) ?? []).length;

const problems = [
  count(/url:"manifest\.webmanifest"/g) !== 1 &&
    'sw.js must precache manifest.webmanifest exactly once',
  count(/url:"[^"]+\.woff2"/g) === 0 && 'sw.js must precache the woff2 font',
  // registerType 'prompt': the only skipWaiting is the one in the SKIP_WAITING message handler.
  (count(/skipWaiting/g) !== 1 ||
    !/"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/.test(sw)) &&
    'sw.js may only call skipWaiting from the SKIP_WAITING message handler',
  existsSync('dist/screens.html') && 'screens.html is dev-only and must not ship in dist/',
].filter(Boolean);

for (const problem of problems) console.error(`check-dist: ${problem}`);
if (problems.length > 0) process.exit(1);
console.log('check-dist: dist/sw.js is fine');
