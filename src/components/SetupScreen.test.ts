// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION_SIZE, MEASUREMENT_SET, TABLES_SET } from '../lib/sets';
import { TABLE_FACTORS } from '../lib/topics/tables';
import type { PracticeSet } from '../lib/types';
import SetupScreen from './SetupScreen.svelte';

/** The setup screen with App's defaults: the default size and every table chosen. */
function renderSetup(
  set: PracticeSet,
  {
    tables = [...TABLE_FACTORS],
    size = DEFAULT_SESSION_SIZE,
    onstart = vi.fn(),
    onback = vi.fn(),
  } = {},
) {
  render(SetupScreen, { props: { set, size, tables, onstart, onback } });
}

function pills(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('.pill')];
}

function pressedTables(): number[] {
  return pills()
    .filter((pill) => pill.getAttribute('aria-pressed') === 'true')
    .map((pill) => Number(pill.textContent));
}

function startButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: /^Start/ });
}

describe('SetupScreen', () => {
  it('offers every table for Tafels under the heading "Welke tafels?"', () => {
    renderSetup(TABLES_SET);
    expect(screen.getByRole('heading', { name: 'Welke tafels?', level: 2 }).textContent).toBe(
      'Welke tafels?',
    );
    expect(pills()).toHaveLength(13);
    expect(pressedTables()).toEqual(TABLE_FACTORS);
  });

  it('toggles a table with its pill', async () => {
    renderSetup(TABLES_SET);
    await fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(pressedTables()).toEqual(TABLE_FACTORS.filter((t) => t !== 7));
    expect(pressedTables()).toHaveLength(12);
  });

  it('clears and restores the choice with Geen and Alle', async () => {
    renderSetup(TABLES_SET);
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    expect(pressedTables()).toEqual([]);
    expect(startButton().disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(pressedTables()).toEqual(TABLE_FACTORS);
    expect(startButton().disabled).toBe(false);
  });

  it('starts with a single chosen table', async () => {
    const onstart = vi.fn();
    renderSetup(TABLES_SET, { onstart });
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    await fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(pressedTables()).toEqual([7]);
    await fireEvent.click(startButton());
    expect(onstart).toHaveBeenCalledOnce();
  });

  it('shows the chosen tables it is given', () => {
    renderSetup(TABLES_SET, { tables: [3, 14] });
    expect(pressedTables()).toEqual([3, 14]);
  });

  it('shows no caption above Start for Tafels', () => {
    renderSetup(TABLES_SET);
    expect(screen.queryByText(/gekozen/)).toBeNull();
    expect(startButton().previousElementSibling).toBeNull();
  });

  it('lists the topics as rows instead of tables for the other sets, with the tables row last', () => {
    renderSetup(MEASUREMENT_SET);
    expect(pills()).toEqual([]);
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.getByText('Lengte')).toBeTruthy();
    expect(screen.getByText('mm t/m km')).toBeTruthy();
    const names = [...document.querySelectorAll('.row-name')].map((el) => el.textContent);
    expect(names.at(-1)).toBe('15% tafels');
    expect(startButton().disabled).toBe(false);
  });

  it('drops the tables row at size 5', () => {
    renderSetup(MEASUREMENT_SET, { size: 5 });
    expect(screen.queryByText('15% tafels')).toBeNull();
  });

  it('shows the set glyph next to the title', () => {
    renderSetup(MEASUREMENT_SET);
    expect(document.querySelector('header svg[viewBox="0 0 28 28"]')).not.toBeNull();
  });

  it('changes the size with a segment and shows it in Start', async () => {
    renderSetup(MEASUREMENT_SET);
    await fireEvent.click(screen.getByRole('radio', { name: '25' }));
    expect(screen.getByRole('radio', { name: '25' }).getAttribute('aria-checked')).toBe('true');
    expect(startButton().textContent).toBe('Start · 25 opgaven');
  });

  it('moves the selection with the arrow keys', async () => {
    renderSetup(MEASUREMENT_SET);
    await fireEvent.keyDown(screen.getByRole('radio', { name: '15' }), { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: '25' }).getAttribute('aria-checked')).toBe('true');
  });

  it('puts the count in its own element', () => {
    renderSetup(MEASUREMENT_SET);
    expect(startButton().querySelector('.start-number')?.textContent).toBe('15');
    expect(startButton().textContent).toBe('Start · 15 opgaven');
  });

  it('calls onback with Terug', async () => {
    const onback = vi.fn();
    renderSetup(MEASUREMENT_SET, { onback });
    await fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(onback).toHaveBeenCalledOnce();
  });
});
