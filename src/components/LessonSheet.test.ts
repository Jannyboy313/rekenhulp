// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FIXTURE_LESSON } from '../lib/lessons/fixture';
import LessonSheet from './LessonSheet.svelte';

const TOPIC = FIXTURE_LESSON.topics[0]!;

// jsdom has no modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
});

function renderSheet() {
  const onclose = vi.fn();
  const result = render(LessonSheet, { topic: TOPIC, onclose });
  const dialog = result.container.querySelector('dialog')!;
  return { ...result, onclose, dialog };
}

describe('LessonSheet', () => {
  it('opens as a modal dialog labelled by the topic title', () => {
    const { dialog } = renderSheet();
    expect(dialog.showModal).toHaveBeenCalled();
    expect(dialog.open).toBe(true);
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toBe('Grote tafels splitsen');
  });

  it('shows the blocks of the topic and nothing to navigate', () => {
    const { container } = renderSheet();
    expect(container.querySelector('.worked-line')?.textContent).toBe(
      '13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91',
    );
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sluiten',
    ]);
  });

  it('closes with the ✕ button', async () => {
    const { onclose } = renderSheet();
    await fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('closes with Esc instead of closing itself', async () => {
    const { onclose, dialog } = renderSheet();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('closes on a tap on the backdrop, not on one inside the sheet', async () => {
    const { onclose, dialog, container } = renderSheet();
    await fireEvent.click(container.querySelector('.worked')!);
    expect(onclose).not.toHaveBeenCalled();
    await fireEvent.click(dialog);
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('closes on the system back', async () => {
    const { onclose } = renderSheet();
    await fireEvent(window, new PopStateEvent('popstate'));
    expect(onclose).toHaveBeenCalledOnce();
  });
});
