// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import SetOverview from './SetOverview.svelte';

const practice = createRawSnippet(() => ({ render: () => '<p>oefenlijst</p>' }));
const lessons = createRawSnippet(() => ({ render: () => '<p>lesstoflijst</p>' }));

function renderOverview(tab: 'practice' | 'lessons', ontab = vi.fn()) {
  render(SetOverview, { tab, ontab, practice, lessons });
  return ontab;
}

describe('SetOverview', () => {
  it('shows the title and subtitle', () => {
    renderOverview('practice');
    expect(screen.getByRole('heading', { name: 'Rekenhulp' })).toBeTruthy();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
  });

  it('renders the practice list on the Oefenen tab', () => {
    renderOverview('practice');
    expect(screen.getByRole('tab', { name: 'Oefenen' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Lesstof' }).getAttribute('aria-selected')).toBe(
      'false',
    );
    expect(screen.getByRole('tabpanel').textContent).toBe('oefenlijst');
  });

  it('renders the lesson list on the Lesstof tab', () => {
    renderOverview('lessons');
    expect(screen.getByRole('tab', { name: 'Lesstof' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('lesstoflijst');
  });

  it('switches tab on a click', async () => {
    const ontab = renderOverview('practice');
    await fireEvent.click(screen.getByRole('tab', { name: 'Lesstof' }));
    expect(ontab).toHaveBeenCalledWith('lessons');
  });

  it('moves between the tabs with the arrow keys', async () => {
    const ontab = renderOverview('practice');
    const lessonsTab = screen.getByRole('tab', { name: 'Lesstof' });
    await fireEvent.keyDown(screen.getByRole('tab', { name: 'Oefenen' }), { key: 'ArrowRight' });
    expect(ontab).toHaveBeenCalledWith('lessons');
    expect(document.activeElement).toBe(lessonsTab);
  });

  it('only the selected tab is in the tab order', () => {
    renderOverview('lessons');
    expect(screen.getByRole('tab', { name: 'Lesstof' }).tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: 'Oefenen' }).tabIndex).toBe(-1);
  });
});
