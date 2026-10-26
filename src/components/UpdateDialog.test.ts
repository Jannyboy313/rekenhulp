// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import UpdateDialog from './UpdateDialog.svelte';

function renderDialog({ oninstall = vi.fn(), onlater = vi.fn() } = {}) {
  render(UpdateDialog, { props: { oninstall, onlater } });
  return { oninstall, onlater };
}

describe('UpdateDialog', () => {
  it('is a modal dialog with the message', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Er is een nieuwe versie beschikbaar. Nu installeren?');
  });

  it('focuses Installeren', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Installeren' }));
  });

  it('installs and postpones with its buttons', async () => {
    const { oninstall, onlater } = renderDialog();
    await fireEvent.click(screen.getByRole('button', { name: 'Installeren' }));
    expect(oninstall).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onlater).toHaveBeenCalledTimes(1);
  });

  it('treats Escape as Later', async () => {
    const { oninstall, onlater } = renderDialog();
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onlater).toHaveBeenCalledTimes(1);
    expect(oninstall).not.toHaveBeenCalled();
  });
});
