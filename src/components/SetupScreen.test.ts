// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { MEASUREMENT_SET, TABLES_SET } from '../lib/sets';
import { TABLE_FACTORS } from '../lib/topics/tables';
import SetupScreen from './SetupScreen.svelte';

function tableToggles(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[name="tables"]')];
}

function checkedTables(): number[] {
  return tableToggles()
    .filter((toggle) => toggle.checked)
    .map((toggle) => Number(toggle.value));
}

function startButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Start' });
}

describe('SetupScreen', () => {
  it('offers every table for Tafels, all chosen by default', () => {
    render(SetupScreen, { props: { set: TABLES_SET, onstart: vi.fn(), onback: vi.fn() } });
    expect(tableToggles().map((toggle) => Number(toggle.value))).toEqual(TABLE_FACTORS);
    expect(checkedTables()).toEqual(TABLE_FACTORS);
  });

  it('clears and restores the choice with Geen and Alle', async () => {
    render(SetupScreen, { props: { set: TABLES_SET, onstart: vi.fn(), onback: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    expect(checkedTables()).toEqual([]);
    expect(startButton().disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(checkedTables()).toEqual(TABLE_FACTORS);
    expect(startButton().disabled).toBe(false);
  });

  it('starts with a single chosen table', async () => {
    const onstart = vi.fn();
    render(SetupScreen, { props: { set: TABLES_SET, onstart, onback: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: '7' }));
    expect(checkedTables()).toEqual([7]);
    await fireEvent.click(startButton());
    expect(onstart).toHaveBeenCalledOnce();
  });

  it('shows the chosen tables it is given', () => {
    render(SetupScreen, {
      props: { set: TABLES_SET, tables: [3, 14], onstart: vi.fn(), onback: vi.fn() },
    });
    expect(checkedTables()).toEqual([3, 14]);
  });

  it('lists the topics instead of tables for the other sets', () => {
    render(SetupScreen, { props: { set: MEASUREMENT_SET, onstart: vi.fn(), onback: vi.fn() } });
    expect(tableToggles()).toEqual([]);
    expect(screen.getByText('15% tafels')).toBeTruthy();
    expect(startButton().disabled).toBe(false);
  });
});
