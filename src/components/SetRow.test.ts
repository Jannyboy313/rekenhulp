// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { TABLES_SET } from '../lib/sets';
import SetRow from './SetRow.svelte';

describe('SetRow', () => {
  it('shows the name and description and handles a click', async () => {
    const onclick = vi.fn();
    render(SetRow, { set: TABLES_SET, onclick });
    const row = screen.getByRole('button', { name: /^Tafels/ });
    expect(row.textContent).toContain(TABLES_SET.description);
    await fireEvent.click(row);
    expect(onclick).toHaveBeenCalledOnce();
  });

  // Only the attribute: jsdom dispatches a synthetic click even to a disabled button.
  it('can be disabled', () => {
    render(SetRow, { set: TABLES_SET, disabled: true, onclick: () => {} });
    const row = screen.getByRole<HTMLButtonElement>('button', { name: /^Tafels/ });
    expect(row.disabled).toBe(true);
  });
});
