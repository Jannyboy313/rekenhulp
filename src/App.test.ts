// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('system back on setup and results returns to the overview', async () => {
    render(App);
    await click(/Tafels/);
    await systemBack();
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();

    await click(/Tafels/);
    await click('Start');
    await click('Stop');
    await systemBack();
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();
  });

  it('system back is ignored during a session, also when repeated', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    render(App);
    await click(/Tafels/);
    await click('Start');
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
    await click('Start');
    await click('Stop');
    await click('Menu');
    expect(history.back).toHaveBeenCalledTimes(2);
    // The popstate of that history.back() must not count as a system back.
    await systemBack();
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();
  });

  it('opens on the set overview without a preselected set', () => {
    render(App);
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tafels/ })).toBeTruthy();
  });

  it('walks from a set via setup to the first exercise', async () => {
    render(App);
    await click(/Tafels/);
    expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();
    expect(screen.getByText('Tafels van 2 t/m 15 (zonder 10)')).toBeTruthy();
    expect((screen.getByLabelText('15') as HTMLInputElement).checked).toBe(true);
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('uses the chosen session size and keeps it after Menu', async () => {
    render(App);
    await click(/Tafels/);
    await fireEvent.click(screen.getByLabelText('25'));
    await click('Start');
    expect(screen.getByText('1 / 25')).toBeTruthy();

    await click('Stop');
    expect(screen.getByText('Geen opgaven beantwoord.')).toBeTruthy();
    await click('Menu');
    await click(/Tafels/);
    expect((screen.getByLabelText('25') as HTMLInputElement).checked).toBe(true);
  });

  it('Terug returns to the overview and Opnieuw starts a fresh session', async () => {
    render(App);
    await click(/Tafels/);
    await click('Terug');
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();

    await click(/Tafels/);
    await click('Start');
    await click('Stop');
    await click('Opnieuw');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('offers Meten with its topics and the tables share', async () => {
    render(App);
    await click(/Meten/);
    expect(screen.getByRole('heading', { name: 'Meten' })).toBeTruthy();
    expect(screen.getByText('Grote getallen (duizend t/m quadriljoen)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('offers Verhoudingen with its topics and the tables share', async () => {
    render(App);
    await click(/Verhoudingen/);
    expect(screen.getByRole('heading', { name: 'Verhoudingen' })).toBeTruthy();
    expect(
      screen.getByText('Procenten (deel, percentage, korting/verhoging, terug naar 100%)'),
    ).toBeTruthy();
    expect(screen.getByText('Verhoudingen (ontbrekend getal, herschalen, verdelen)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('offers Getallen & delers with its topics and the tables share', async () => {
    render(App);
    await click(/Getallen/);
    expect(screen.getByRole('heading', { name: 'Getallen & delers' })).toBeTruthy();
    expect(screen.getByText('KGV (kleinste gemene veelvoud)')).toBeTruthy();
    expect(screen.getByText('Kwadraten en wortels (2² t/m 25²)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('offers Bewerkingen with its topics and the tables share', async () => {
    render(App);
    await click(/Bewerkingen/);
    expect(screen.getByRole('heading', { name: 'Bewerkingen' })).toBeTruthy();
    expect(screen.getByText('Eigenschappen (commutatief, associatief, distributief)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });
});
