// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

async function click(name: string | RegExp) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

describe('App', () => {
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
