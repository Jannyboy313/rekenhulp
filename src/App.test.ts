// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';
import { stubMatchMedia } from './components/testMatchMedia';
import { choosesTables, DEFAULT_SESSION_SIZE, describeSetTopicRows, PRACTICE_SETS } from './lib/sets';

async function click(name: string | RegExp) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

/** A system back that consumes the guard entry (jsdom does not traverse history by itself). */
async function systemBack() {
  await fireEvent(window, new PopStateEvent('popstate'));
}

describe('App', () => {
  // A real history.back() fires a popstate later, which could leak into the next test.
  beforeEach(() => {
    vi.spyOn(history, 'back').mockImplementation(() => {});
    stubMatchMedia();
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
});
