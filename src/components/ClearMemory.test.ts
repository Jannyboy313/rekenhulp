// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVolatileMemory, type Memory, type PracticeRecord } from '../lib/memory';
import ClearMemory from './ClearMemory.svelte';

const RECORD: PracticeRecord = { topic: 'tables', correct: true, at: 1000, source: 'set' };

async function filledMemory(): Promise<Memory> {
  const memory = createVolatileMemory();
  await memory.add([RECORD]);
  return memory;
}

const button = (name: string) => screen.queryByRole('button', { name });

async function click(name: string) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

describe('ClearMemory (memory spec §5)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows only the button at first', async () => {
    render(ClearMemory, { memory: await filledMemory() });
    expect(button('Gegevens wissen')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('asks before clearing, with the focus on Annuleren', async () => {
    render(ClearMemory, { memory: await filledMemory() });
    await click('Gegevens wissen');
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Gegevens wissen?');
    expect(dialog.textContent).toContain(
      'Je resultaten op dit apparaat worden verwijderd. Dit kan niet ongedaan worden gemaakt.',
    );
    expect(document.activeElement).toBe(button('Annuleren'));
  });

  it.each([
    { name: 'Annuleren', cancel: () => click('Annuleren') },
    { name: 'Escape', cancel: () => fireEvent.keyDown(window, { key: 'Escape' }) },
  ])('keeps the records on $name', async ({ cancel }) => {
    const memory = await filledMemory();
    render(ClearMemory, { memory });
    await click('Gegevens wissen');
    await cancel();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await memory.all()).toEqual([RECORD]);
    expect(button('Gegevens wissen')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('clears on Wissen and says so instead of the button', async () => {
    const memory = await filledMemory();
    render(ClearMemory, { memory });
    await click('Gegevens wissen');
    await click('Wissen');
    await vi.waitFor(() => expect(screen.getByRole('status').textContent).toBe('Gegevens gewist.'));
    expect(await memory.all()).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button('Gegevens wissen')).toBeNull();
  });

  it('says that clearing failed, logs it and keeps the button', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('blocked');
    const memory = { ...createVolatileMemory(), clear: () => Promise.reject(failure) };
    render(ClearMemory, { memory });
    await click('Gegevens wissen');
    await click('Wissen');
    await vi.waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Wissen is niet gelukt.'),
    );
    expect(log).toHaveBeenCalledWith(failure);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button('Gegevens wissen')).not.toBeNull();
  });
});
