// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION_SIZE, MEASUREMENT_SET, TABLES_SET } from '../lib/sets';
import { TABLE_FACTORS } from '../lib/topics/tables';
import type { PracticeSet } from '../lib/types';
import SetupScreen from './SetupScreen.svelte';

/** The setup screen with App's defaults: the default size and every table chosen. */
function renderSetup(set: PracticeSet, { tables = [...TABLE_FACTORS], onstart = vi.fn() } = {}) {
  render(SetupScreen, {
    props: { set, size: DEFAULT_SESSION_SIZE, tables, onstart, onback: vi.fn() },
  });
}

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
  it('offers every table for Tafels', () => {
    renderSetup(TABLES_SET);
    expect(tableToggles().map((toggle) => Number(toggle.value))).toEqual(TABLE_FACTORS);
    expect(checkedTables()).toEqual(TABLE_FACTORS);
  });

  it('clears and restores the choice with Geen and Alle', async () => {
    renderSetup(TABLES_SET);
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    expect(checkedTables()).toEqual([]);
    expect(startButton().disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(checkedTables()).toEqual(TABLE_FACTORS);
    expect(startButton().disabled).toBe(false);
  });

  it('starts with a single chosen table', async () => {
    const onstart = vi.fn();
    renderSetup(TABLES_SET, { onstart });
    await fireEvent.click(screen.getByRole('button', { name: 'Geen' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: '7' }));
    expect(checkedTables()).toEqual([7]);
    await fireEvent.click(startButton());
    expect(onstart).toHaveBeenCalledOnce();
  });

  it('shows the chosen tables it is given', () => {
    renderSetup(TABLES_SET, { tables: [3, 14] });
    expect(checkedTables()).toEqual([3, 14]);
  });

  it('lists the topics instead of tables for the other sets', () => {
    renderSetup(MEASUREMENT_SET);
    expect(tableToggles()).toEqual([]);
    expect(screen.getByText('15% tafels')).toBeTruthy();
    expect(startButton().disabled).toBe(false);
  });
});
