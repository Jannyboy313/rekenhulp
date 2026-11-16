// `npm run screenshots`: one PNG per shot in this folder, numbered in list order.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

interface Shot {
  id: string;
  /** A key of SCENES in src/screens/scenes.ts. */
  scene: string;
  steps?: (page: Page) => Promise<void>;
}

// Mirrors ANSWER_KINDS in src/screens/questionOfKind.ts; 'every scene has a shot' catches drift.
const KINDS = [
  'number',
  'fraction',
  'boolean',
  'expression',
  'factorization',
  'scientific',
  'baseDigits',
  'roman',
  'choice',
];

/** Keypad buttons by accessible name ('5', 'komma', 'OK'). */
async function press(page: Page, ...names: string[]) {
  for (const name of names) await page.getByRole('button', { name, exact: true }).click();
}

/**
 * fullPage only sees the document; a screen that scrolls inside its own container (results list,
 * lesson sheet) is cut off. Taller viewport until no scroll container overflows. Only real
 * scroll containers count: a stray clipped pixel elsewhere would grow screens past height-based
 * layouts (the kladblok shows more cells above 815px).
 */
async function growToContent(page: Page) {
  for (let round = 0; round < 5; round++) {
    const overflow = await page.evaluate(() =>
      Math.max(
        0,
        ...[...document.querySelectorAll('*')]
          .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
          .map((el) => el.scrollHeight - el.clientHeight),
      ),
    );
    if (overflow <= 1) return;
    const size = page.viewportSize();
    if (!size) return;
    await page.setViewportSize({ width: size.width, height: size.height + overflow });
  }
}

const SHOTS: readonly Shot[] = [
  { id: 'overview-practice', scene: 'app' },
  {
    id: 'overview-lessons',
    scene: 'app',
    steps: (page) => page.getByRole('tab', { name: 'Lesstof' }).click(),
  },
  {
    id: 'overview-review',
    scene: 'app-review',
    steps: (page) => page.getByRole('button', { name: /Fouten van eerder/ }).waitFor(),
  },
  { id: 'update-dialog', scene: 'app-update' },
  {
    id: 'clear-dialog',
    scene: 'app',
    steps: (page) => page.getByRole('button', { name: 'Gegevens wissen' }).click(),
  },
  { id: 'setup-quick', scene: 'setup-quick' },
  { id: 'setup-deep', scene: 'setup-deep' },
  { id: 'setup-tables', scene: 'setup-tables' },
  { id: 'setup-mixed', scene: 'setup-mixed' },
  ...KINDS.map((kind) => ({ id: `question-${kind}`, scene: `question-${kind}` })),
  {
    id: 'question-correct',
    scene: 'question-percent',
    steps: (page) => press(page, '2', '0', 'OK'),
  },
  {
    id: 'question-wrong',
    scene: 'question-percent',
    steps: (page) => press(page, '4', 'OK'),
  },
  {
    id: 'question-scratchpad',
    scene: 'question-percent',
    steps: async (page) => {
      await page.getByRole('button', { name: /^Kladblok vak 1/ }).click();
      await press(page, '8', '0', 'gedeeld door', '4');
    },
  },
  {
    id: 'lesson-sheet',
    scene: 'question-percent',
    steps: async (page) => {
      await press(page, '4', 'OK');
      await page.getByRole('button', { name: /^Les/ }).first().click();
    },
  },
  { id: 'results-perfect', scene: 'results-perfect' },
  { id: 'results-mistakes', scene: 'results-mistakes' },
  { id: 'test-setup', scene: 'test-setup' },
  // "question-" in the ids: the compact project takes these play screen shots too.
  { id: 'question-test', scene: 'test' },
  {
    id: 'question-test-last-minute',
    scene: 'test',
    steps: (page) => page.clock.runFor('16:05'),
  },
  {
    id: 'question-test-stop',
    scene: 'test',
    steps: (page) => page.getByRole('button', { name: 'Stoppen' }).click(),
  },
  { id: 'results-test-passed', scene: 'results-test-passed' },
  { id: 'results-test-failed', scene: 'results-test-failed' },
  { id: 'lesson-topics', scene: 'lesson-topics' },
  { id: 'lesson', scene: 'lesson' },
  { id: 'error', scene: 'error' },
  { id: 'too-low', scene: 'too-low' },
];

/** One folder per project, so per layout (playwright.config.ts). */
const dirOf = (project: string) => join(import.meta.dirname, project);

test.beforeAll(({}, testInfo) => {
  const dir = dirOf(testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.png')) rmSync(join(dir, file));
  }
});

test('every scene has a shot', async ({ page }) => {
  await page.goto('/screens.html');
  const ids = await page.evaluate(() => window.__sceneIds);
  const used = new Set(SHOTS.map((shot) => shot.scene));
  expect(ids.filter((id) => !used.has(id))).toEqual([]);
});

SHOTS.forEach((shot, index) => {
  test(shot.id, async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    // Frozen timers: the correct state stays on screen (no auto-advance).
    await page.clock.install();
    await page.goto(`/screens.html#${shot.scene}`);
    await page.evaluate(() => document.fonts.ready);
    await shot.steps?.(page);
    // Before the phone grows: a block that scrolls sideways must keep its height in the first
    // viewport (as a flex item of a scrolling column it may shrink to nothing).
    const clipped = await page.evaluate(
      () =>
        [...document.querySelectorAll('.table-box')].filter(
          (box) => box.scrollHeight - box.clientHeight > 1,
        ).length,
    );
    expect(clipped, 'lesson tables cut off vertically').toBe(0);
    // Only the lists inside a screen scroll, never the document: an absolutely positioned
    // element (the hidden text of a fraction) outside a positioned scroll container would
    // make the page scroll, header included.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    expect(pageOverflow, 'the document itself scrolls').toBeLessThanOrEqual(0);
    // A tablet keeps its viewport: a taller one would be another layout (v4 spec §3.1).
    if (project === 'phone') await growToContent(page);
    const name = `${String(index + 1).padStart(2, '0')}-${shot.id}.png`;
    await page.screenshot({
      path: join(dirOf(project), name),
      fullPage: true,
      animations: 'disabled',
    });
  });
});
