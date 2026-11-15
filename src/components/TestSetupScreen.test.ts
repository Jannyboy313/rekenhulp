// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { TestConfig } from '../lib/practiceTest';
import TestSetupScreen from './TestSetupScreen.svelte';

function renderSetup(config: TestConfig = { length: 'short', lkt: false }) {
  const onstart = vi.fn();
  const onback = vi.fn();
  render(TestSetupScreen, { props: { ...config, onstart, onback } });
  return { onstart, onback };
}

const radio = (name: string) => screen.getByRole('radio', { name });
const checked = (name: string) => radio(name).getAttribute('aria-checked') === 'true';
const rows = () =>
  [...document.querySelectorAll('.domains li')].map((li) =>
    [...li.children].map((cell) => cell.textContent),
  );
const start = () => screen.getByRole('button', { name: /^Start/ });

describe('TestSetupScreen (test spec §4.2)', () => {
  it('shows the defaults: Kort and RWT', () => {
    renderSetup();
    expect(screen.getByRole('heading', { name: 'Oefentoets' })).toBeTruthy();
    expect(checked('Kort')).toBe(true);
    expect(checked('RWT')).toBe(true);
    expect(screen.getByText('15 opgaven · 17 minuten')).toBeTruthy();
    expect(screen.getByText('De vier domeinen van de RWT')).toBeTruthy();
    expect(rows()).toEqual([
      ['Hele getallen', '8 opgaven'],
      ['Verhoudingen en breuken', '5 opgaven'],
      ['Meten en meetkunde', '2 opgaven'],
    ]);
    expect(start().textContent).toBe('Start · 15 opgaven');
    expect((start() as HTMLButtonElement).disabled).toBe(false);
  });

  it('explains how the test works', () => {
    renderSetup();
    expect(screen.getByText('Je ziet pas na afloop wat goed en fout was.')).toBeTruthy();
    expect(
      screen.getByText('De tijd loopt door, ook als je de app verlaat. Bij 0:00 stopt de toets.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Niet beantwoord telt als fout. Je bent geslaagd vanaf 70% goed.'),
    ).toBeTruthy();
  });

  it('follows the choice of Lang', async () => {
    renderSetup();
    await fireEvent.click(radio('Lang'));
    expect(screen.getByText('50 opgaven · 57 minuten')).toBeTruthy();
    expect(rows().map(([, count]) => count)).toEqual([
      '15 opgaven',
      '14 opgaven',
      '12 opgaven',
      '9 opgaven',
    ]);
    expect(start().textContent).toBe('Start · 50 opgaven');
  });

  it('adds Heuristieken with RWT + LKT', async () => {
    renderSetup({ length: 'long', lkt: false });
    await fireEvent.click(radio('RWT + LKT'));
    expect(screen.getByText('Ook Getallen & delers, Talstelsels en Heuristieken')).toBeTruthy();
    expect(rows()).toEqual([
      ['Hele getallen', '13 opgaven'],
      ['Verhoudingen en breuken', '12 opgaven'],
      ['Meten en meetkunde', '10 opgaven'],
      ['Verbanden en statistiek', '8 opgaven'],
      ['Heuristieken', '7 opgaven'],
    ]);
  });

  it('gives Kort with LKT two Heuristieken exercises', () => {
    renderSetup({ length: 'short', lkt: true });
    expect(rows().map(([name, count]) => `${name}: ${count}`)).toEqual([
      'Hele getallen: 7 opgaven',
      'Verhoudingen en breuken: 4 opgaven',
      'Meten en meetkunde: 2 opgaven',
      'Heuristieken: 2 opgaven',
    ]);
  });

  it('steps through Lengte with the arrow keys', async () => {
    renderSetup();
    await fireEvent.keyDown(radio('Kort'), { key: 'ArrowRight' });
    await tick();
    expect(checked('Lang')).toBe(true);
  });

  it('starts and goes back', async () => {
    const { onstart, onback } = renderSetup();
    await fireEvent.click(start());
    expect(onstart).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(onback).toHaveBeenCalledOnce();
  });
});
