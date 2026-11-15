// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';
import { viewport } from './components/layout.svelte';
import { FIXTURE_LESSON } from './lib/lessons/fixture';
import { DEEP_FIXTURE_SET } from './lib/setFixture';
import type { PracticeSet } from './lib/types';
import { createUpdates } from './lib/update';
import {
  choosesTables,
  DEFAULT_SESSION_SIZE,
  describeSetTopicRows,
  FRACTIONS_SET,
  GEOMETRY_SET,
  HEURISTICS_SET,
  MEASUREMENT_SET,
  NUMBER_SENSE_SET,
  NUMBER_SYSTEMS_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  RELATIONS_SET,
} from './lib/sets';

async function click(name: string | RegExp) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

/** A system back that consumes the guard entry (jsdom does not traverse history by itself). */
async function systemBack() {
  await fireEvent(window, new PopStateEvent('popstate'));
}

function resize(width: number, height: number) {
  window.innerWidth = width;
  window.innerHeight = height;
}

describe('App', () => {
  // A real history.back() fires a popstate later, which could leak into the next test.
  beforeEach(() => {
    vi.spyOn(history, 'back').mockImplementation(() => {});
    // jsdom's window is 1024 × 768, a landscape tablet (v4 spec §3.1); these tests are the phone's.
    resize(360, 780);
  });

  it('keeps the layout of the viewport on the root element', async () => {
    render(App);
    expect(document.documentElement.dataset.layout).toBe('phone');
    resize(1280, 800);
    await fireEvent(window, new Event('resize'));
    expect(document.documentElement.dataset.layout).toBe('tablet-landscape');
    // Too low: the screen under the notice keeps its layout (v4 spec §3.2).
    resize(780, 360);
    await fireEvent(window, new Event('resize'));
    expect(document.documentElement.dataset.layout).toBe('tablet-landscape');
  });

  describe('too low (v4 spec §3.3)', () => {
    async function rotate(width: number, height: number) {
      resize(width, height);
      await fireEvent(window, new Event('resize'));
    }
    const screens = () => document.querySelector<HTMLElement>('.screens');

    it('shows a notice over the screen, which becomes inert', async () => {
      render(App);
      expect(screens()?.inert).toBe(false);
      await rotate(780, 360);
      expect(screen.getByRole('heading', { name: 'Scherm te laag' })).toBeTruthy();
      expect(screen.getByText('Draai je apparaat of maak het venster groter.')).toBeTruthy();
      expect(screens()?.inert).toBe(true);

      await rotate(360, 780);
      expect(screen.queryByRole('heading', { name: 'Scherm te laag' })).toBeNull();
      expect(screens()?.inert).toBe(false);
    });

    it('keeps a running session with its typed answer', async () => {
      render(App);
      await click(/Tafels/);
      await click(/^Start/);
      const prompt = document.querySelector('.prompt')?.textContent;
      await click('1');
      await rotate(780, 360);
      // The screen under the notice does not reflow, and a physical key does not reach it.
      expect(viewport.height).toBe(780);
      await fireEvent.keyDown(window, { key: '5' });
      await rotate(360, 780);
      expect(document.querySelector('.prompt')?.textContent).toBe(prompt);
      expect(screen.getByLabelText('Jouw antwoord').textContent?.trim()).toBe('1');
    });

    it('holds the update dialog back until the screen is high enough', async () => {
      const updates = createUpdates(vi.fn());
      render(App, { updates });
      await rotate(780, 360);
      updates.needRefresh();
      await tick();
      expect(screen.queryByText(/nieuwe versie beschikbaar/)).toBeNull();
      await rotate(360, 780);
      expect(screen.getByText(/nieuwe versie beschikbaar/)).toBeTruthy();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('system back on setup and results returns to the overview', async () => {
    render(App);
    await click(/Tafels/);
    await systemBack();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();

    await click(/Tafels/);
    await click(/^Start/);
    await click('Stoppen');
    await systemBack();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
  });

  it('system back is ignored during a session, also when repeated', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    render(App);
    await click(/Tafels/);
    await click(/^Start/);
    await systemBack();
    await systemBack();
    expect(screen.getByText('1 / 15')).toBeTruthy();
    // One entry for leaving the overview, then one again after each ignored back.
    expect(pushState).toHaveBeenCalledTimes(3);
  });

  it('removes the guard entry when Terug or Menu returns to the overview', async () => {
    render(App);
    await click(/Tafels/);
    await click('Terug');
    expect(history.back).toHaveBeenCalledTimes(1);

    await click(/Tafels/);
    await click(/^Start/);
    await click('Stoppen');
    await click('Menu');
    expect(history.back).toHaveBeenCalledTimes(2);
    // The popstate of that history.back() must not count as a system back.
    await systemBack();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
  });

  it('opens on the set overview without a preselected set', () => {
    render(App);
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tafels/ })).toBeTruthy();
  });

  it('walks from a set via setup to the first exercise', async () => {
    render(App);
    await click(/Tafels/);
    expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Welke tafels?' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '15' }).getAttribute('aria-checked')).toBe('true');
    await click(/^Start/);
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('practises only the chosen tables, also after Opnieuw and Menu', async () => {
    render(App);
    await click(/Tafels/);
    await click('Geen');
    await click('7');
    await click(/^Start/);
    for (let round = 0; round < 10; round++) {
      // Every prompt shows the table itself or a multiple of it (the product).
      const prompt = document.querySelector('.prompt')!.textContent!;
      const numbers = [...prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect(numbers.some((n) => n % 7 === 0)).toBe(true);
      await click('Stoppen');
      await click('Opnieuw');
    }
    await click('Stoppen');
    await click('Menu');
    await click(/Tafels/);
    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.textContent)).toEqual(['7']);
  });

  it('uses the chosen session size and keeps it after Menu', async () => {
    render(App);
    await click(/Tafels/);
    await fireEvent.click(screen.getByRole('radio', { name: '25' }));
    await click(/^Start/);
    expect(screen.getByText('1 / 25')).toBeTruthy();

    await click('Stoppen');
    expect(screen.getByText('Geen opgaven beantwoord.')).toBeTruthy();
    await click('Menu');
    await click(/Tafels/);
    expect(screen.getByRole('radio', { name: '25' }).getAttribute('aria-checked')).toBe('true');
  });

  it('Terug returns to the overview and Opnieuw starts a fresh session', async () => {
    render(App);
    await click(/Tafels/);
    await click('Terug');
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();

    await click(/Tafels/);
    await click(/^Start/);
    await click('Stoppen');
    await click('Opnieuw');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('practises the mistakes, again from the mistakes of that session, and Opnieuw', async () => {
    render(App);
    await click(/Tafels/);
    await click(/^Start/);
    // 1 is never a table answer (factors 2 t/m 15, products from 4).
    await click('1');
    await click('OK');
    await click('Verder');
    await click('Stoppen');
    await click('Fouten oefenen · 3');
    expect(screen.getByText('1 / 3')).toBeTruthy();

    await click('1');
    await click('OK');
    await click('Verder');
    await click('Stoppen');
    await click('Fouten oefenen · 3');
    expect(screen.getByText('1 / 3')).toBeTruthy();

    await click('Stoppen');
    await click('Opnieuw');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it.each(PRACTICE_SETS)('offers $name with its topics and starts a session', async (set) => {
    render(App);
    await click(new RegExp(`^${set.name}`));
    expect(screen.getByRole('heading', { name: set.name })).toBeTruthy();
    // Tafels shows the table choice instead (see above).
    if (!choosesTables(set)) {
      for (const { name } of describeSetTopicRows(set)) {
        expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      }
    }
    await click(/^Start/);
    expect(screen.getByText(`1 / ${DEFAULT_SESSION_SIZE}`)).toBeTruthy();
  });

  describe('update prompt', () => {
    const asked = 'Er is een nieuwe versie beschikbaar. Nu installeren?';

    it('shows on the overview and setup only, and waits for an allowed screen', async () => {
      const updates = createUpdates(vi.fn());
      render(App, { updates });
      await click(/Tafels/);
      await click(/^Start/);
      updates.needRefresh();
      await tick();
      expect(screen.queryByText(asked)).toBeNull();

      await click('Stoppen');
      expect(screen.queryByText(asked)).toBeNull();
      await click('Menu');
      expect(screen.getByText(asked)).toBeTruthy();

      await click('Later');
      await click(/Tafels/);
      expect(screen.queryByText(asked)).toBeNull();
    });

    it('does not show during a lesson, and installs on Installeren', async () => {
      const install = vi.fn();
      const updates = createUpdates(install);
      render(App, { lessons: [FIXTURE_LESSON], updates });
      await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
      await click(/^Tafels/);
      await click(/^Halveren/);
      updates.needRefresh();
      await tick();
      expect(screen.queryByText(asked)).toBeNull();

      await click('Terug');
      await click('Terug');
      await click('Installeren');
      expect(install).toHaveBeenCalledTimes(1);
    });

    it('offers a postponed update again on resume', async () => {
      const updates = createUpdates(vi.fn());
      render(App, { updates });
      updates.needRefresh();
      await tick();
      await click('Later');
      expect(screen.queryByText(asked)).toBeNull();
      updates.resume();
      await tick();
      expect(screen.getByText(asked)).toBeTruthy();
    });
  });

  describe('lesstof', () => {
    function lessonsTabSelected(): boolean {
      return screen.getByRole('tab', { name: 'Lesstof' }).getAttribute('aria-selected') === 'true';
    }

    async function openFixtureTopic() {
      await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
      await click(/^Tafels/);
      await click(/^Halveren/);
    }

    it('opens a topic from the Lesstof tab and goes back with Terug', async () => {
      render(App, { lessons: [FIXTURE_LESSON] });
      await openFixtureTopic();
      expect(screen.getByRole('heading', { name: 'Halveren' })).toBeTruthy();

      await click('Terug');
      expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();

      await click('Terug');
      expect(lessonsTabSelected()).toBe(true);
      expect(history.back).toHaveBeenCalledTimes(1);
    });

    it('moves one level up on a system back and re-arms the guard', async () => {
      const pushState = vi.spyOn(history, 'pushState');
      render(App, { lessons: [FIXTURE_LESSON] });
      await openFixtureTopic();
      expect(pushState).toHaveBeenCalledTimes(1);

      await systemBack();
      expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();
      expect(pushState).toHaveBeenCalledTimes(2);

      await systemBack();
      expect(lessonsTabSelected()).toBe(true);
    });

    it('enables only the sets with a lesson in the real registry', async () => {
      render(App);
      await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
      const rows = screen.getAllByRole<HTMLButtonElement>('button');
      expect(rows).toHaveLength(PRACTICE_SETS.length);
      expect(rows.filter((row) => !row.disabled).map((row) => row.textContent)).toEqual([
        expect.stringContaining(MEASUREMENT_SET.name),
        expect.stringContaining(PROPORTIONS_SET.name),
        expect.stringContaining(NUMBERS_SET.name),
        expect.stringContaining(OPERATIONS_SET.name),
        expect.stringContaining(NUMBER_SENSE_SET.name),
        expect.stringContaining(FRACTIONS_SET.name),
        expect.stringContaining(GEOMETRY_SET.name),
        expect.stringContaining(RELATIONS_SET.name),
        expect.stringContaining(NUMBER_SYSTEMS_SET.name),
        expect.stringContaining(HEURISTICS_SET.name),
      ]);
    });
  });

  describe('level', () => {
    const isDeep = () => /^(KGV|GGD) van/.test(document.querySelector('.prompt')!.textContent!);
    const checked = (name: string) =>
      screen.getByRole('radio', { name }).getAttribute('aria-checked') === 'true';

    it('starts on Opfrisser and builds Verdieping, also after Opnieuw', async () => {
      render(App, { props: { sets: [DEEP_FIXTURE_SET] } });
      await click(/^Fixture/);
      await click(/^Start/);
      expect(isDeep()).toBe(false);

      await click('Stoppen');
      await click('Menu');
      await click(/^Fixture/);
      await fireEvent.click(screen.getByRole('radio', { name: 'Verdieping' }));
      // Below 10 exercises Verdieping mixes in no Opfrisser share, so every question is deep.
      await fireEvent.click(screen.getByRole('radio', { name: '5' }));
      await click(/^Start/);
      expect(isDeep()).toBe(true);
      await click('Stoppen');
      await click('Opnieuw');
      expect(isDeep()).toBe(true);
    });

    it('opens every set on Opfrisser again, after Terug and after Menu', async () => {
      render(App, { props: { sets: [DEEP_FIXTURE_SET] } });
      await click(/^Fixture/);
      await fireEvent.click(screen.getByRole('radio', { name: 'Verdieping' }));
      await click('Terug');
      await click(/^Fixture/);
      expect(checked('Opfrisser')).toBe(true);

      await fireEvent.click(screen.getByRole('radio', { name: 'Verdieping' }));
      await click(/^Start/);
      await click('Stoppen');
      await click('Menu');
      await click(/^Fixture/);
      expect(checked('Opfrisser')).toBe(true);
    });
  });

  describe('Gemengd (spec §3.1, §3.2, §12.5)', () => {
    const pressed = () =>
      [...document.querySelectorAll('.pill')]
        .filter((pill) => pill.getAttribute('aria-pressed') === 'true')
        .map((pill) => pill.textContent);
    const checked = (name: string) =>
      screen.getByRole('radio', { name }).getAttribute('aria-checked') === 'true';

    it('is the row after the sets on Oefenen, and not on Lesstof', async () => {
      render(App);
      const rows = screen.getAllByRole('button');
      expect(rows).toHaveLength(PRACTICE_SETS.length + 2);
      expect(rows.at(-2)!.textContent).toContain('Gemengd');
      expect(rows.at(-2)!.textContent).toContain('Opgaven uit meerdere sets door elkaar');

      await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
      expect(screen.queryByRole('button', { name: /Gemengd/ })).toBeNull();
    });

    it('opens with every set on Opfrisser, plays as Gemengd and starts again with Opnieuw', async () => {
      render(App);
      await click(/^Gemengd/);
      expect(screen.getByRole('heading', { name: 'Welke sets?' })).toBeTruthy();
      expect(pressed()).toEqual(PRACTICE_SETS.map((set) => set.name));
      expect(checked('Opfrisser')).toBe(true);

      await click(/^Start/);
      expect(screen.getByText('Gemengd')).toBeTruthy();
      expect(screen.getByText('1 / 15')).toBeTruthy();
      await click('Stoppen');
      expect(screen.getByText('Gemengd')).toBeTruthy();
      await click('Opnieuw');
      expect(screen.getByText('Gemengd')).toBeTruthy();
      expect(screen.getByText('1 / 15')).toBeTruthy();
    });

    it('keeps the set choice in memory, but opens on Opfrisser again', async () => {
      render(App);
      await click(/^Gemengd/);
      await click('Geen');
      await click('Meten');
      await fireEvent.click(screen.getByRole('radio', { name: 'Verdieping' }));
      await click('Terug');
      await click(/^Gemengd/);
      expect(pressed()).toEqual(['Meten']);
      expect(checked('Opfrisser')).toBe(true);
    });

    it('builds the session from the chosen sets at the chosen level, also after Opnieuw', async () => {
      const isDeep = () => /^(KGV|GGD) van/.test(document.querySelector('.prompt')!.textContent!);
      render(App, { props: { sets: [DEEP_FIXTURE_SET] } });
      await click(/^Gemengd/);
      expect(pressed()).toEqual([DEEP_FIXTURE_SET.name]);
      await fireEvent.click(screen.getByRole('radio', { name: 'Verdieping' }));
      // Below 10 exercises Verdieping mixes in no Opfrisser share, so every question is deep.
      await fireEvent.click(screen.getByRole('radio', { name: '5' }));
      await click(/^Start/);
      expect(isDeep()).toBe(true);
      await click('Stoppen');
      await click('Opnieuw');
      expect(isDeep()).toBe(true);
    });
  });
  describe('error screen', () => {
    // No topics and no tables: building its session throws.
    const BROKEN_SET: PracticeSet = {
      id: 'broken',
      name: 'Kapot',
      description: 'Kan geen sessie maken',
      topics: [],
      tablesPercent: 0,
    };

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('shows the error screen when a session cannot be built, and returns to the overview', async () => {
      render(App, { props: { sets: [BROKEN_SET] } });
      await click(/^Kapot/);
      await click(/^Start/);
      expect(screen.getByRole('heading', { name: 'Er ging iets mis' })).toBeTruthy();
      expect(console.error).toHaveBeenCalled();
      await click('Naar het begin');
      expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
    });

    it('system back on the error screen returns to the overview', async () => {
      render(App, { props: { sets: [BROKEN_SET] } });
      await click(/^Kapot/);
      await click(/^Start/);
      await systemBack();
      expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
    });

    it('shows the error screen when a screen fails while rendering', async () => {
      const failing: PracticeSet = {
        ...BROKEN_SET,
        get description(): string {
          throw new Error('render failure');
        },
      };
      render(App, { props: { sets: [failing] } });
      await tick();
      expect(screen.getByRole('heading', { name: 'Er ging iets mis' })).toBeTruthy();
    });
  });

  describe('Oefentoets (test spec §4–§6)', () => {
    const asked = 'Er is een nieuwe versie beschikbaar. Nu installeren?';
    const checked = (name: string) =>
      screen.getByRole('radio', { name }).getAttribute('aria-checked') === 'true';

    async function stopTest() {
      await click('Stoppen');
      await fireEvent.click(screen.getByRole('dialog').querySelector('.primary')!);
    }

    /** Gives some answer to the current question, whatever its kind. */
    async function answerSomething() {
      if (screen.queryByRole('button', { name: 'OK' })) await click('OK');
      else if (screen.queryByRole('button', { name: 'Nee' })) await click('Nee');
      else await fireEvent.keyDown(window, { key: '1' });
    }

    it('is the last row on Oefenen, and not on Lesstof', async () => {
      render(App);
      const rows = screen.getAllByRole('button');
      expect(rows.at(-1)!.textContent).toContain('Oefentoets');
      await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
      expect(screen.queryByRole('button', { name: /Oefentoets/ })).toBeNull();
    });

    it('keeps the setup choices in memory', async () => {
      render(App);
      await click(/^Oefentoets/);
      expect(checked('Kort')).toBe(true);
      await fireEvent.click(screen.getByRole('radio', { name: 'Lang' }));
      await click('Terug');
      await click(/^Oefentoets/);
      expect(checked('Lang')).toBe(true);
    });

    it('runs a test, ignores the system back, and starts again with Opnieuw', async () => {
      render(App);
      await click(/^Oefentoets/);
      await click(/^Start/);
      expect(screen.getByText('1 / 15')).toBeTruthy();
      expect(document.querySelector('.countdown')?.textContent).toBe('17:00');

      await systemBack();
      expect(screen.getByText('1 / 15')).toBeTruthy();

      await stopTest();
      expect(screen.getByText('Niet geslaagd')).toBeTruthy();
      expect(document.querySelector('.score')?.textContent?.trim()).toBe('0 / 15');

      await click('Opnieuw');
      expect(screen.getByText('1 / 15')).toBeTruthy();
      expect(document.querySelector('.countdown')).not.toBeNull();
    });

    it('practises the mistakes of a test without a verdict, and Opnieuw starts a test', async () => {
      // A fixed seed, so the answers below give the same mistakes every run.
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
        (array as Uint32Array).fill(42);
        return array;
      });
      render(App);
      await click(/^Oefentoets/);
      await click(/^Start/);
      // Empty input keeps OK disabled, so type a digit first where there is a keypad.
      for (let i = 0; i < 3; i++) {
        if (screen.queryByRole('button', { name: '7' })) await click('7');
        await answerSomething();
      }
      await stopTest();
      await click(/^Fouten oefenen/);
      expect(screen.getByText('Oefentoets')).toBeTruthy();
      expect(document.querySelector('.countdown')).toBeNull();

      await click('Stoppen');
      expect(screen.queryByText(/geslaagd/i)).toBeNull();
      await click('Opnieuw');
      expect(document.querySelector('.countdown')).not.toBeNull();
    });

    it('offers an update on the test setup, never during the test', async () => {
      const updates = createUpdates(vi.fn());
      render(App, { updates });
      await click(/^Oefentoets/);
      updates.needRefresh();
      await tick();
      expect(screen.getByText(asked)).toBeTruthy();
      await click('Later');
      await click(/^Start/);
      updates.resume();
      await tick();
      expect(screen.queryByText(asked)).toBeNull();
    });
  });
});
