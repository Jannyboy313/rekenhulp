// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_LESSON } from '../lib/lessons/fixture';
import LessonView from './LessonView.svelte';

const [splitting, halves] = FIXTURE_LESSON.topics;

describe('LessonView', () => {
  it('shows the topic title', () => {
    render(LessonView, { topic: splitting!, onback: () => {} });
    expect(screen.getByRole('heading', { name: 'Grote tafels splitsen' })).toBeTruthy();
  });

  it('renders a worked line exactly', () => {
    const { container } = render(LessonView, { topic: splitting!, onback: () => {} });
    const lines = [...container.querySelectorAll('.worked-line')].map((l) => l.textContent);
    expect(lines).toEqual(['13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91']);
    expect(screen.getByText('Voorbeeld')).toBeTruthy();
  });

  it('renders the slot of a tip as a question mark', () => {
    const { container } = render(LessonView, { topic: splitting!, onback: () => {} });
    const tip = container.querySelector('.tip');
    expect(tip?.textContent).toBe('TipBij ? × 7 = 91 reken je 91 : 7.');
    expect(tip?.querySelector('.slot')?.textContent).toBe('?');
  });

  it('stacks a fraction in text', () => {
    const { container } = render(LessonView, { topic: halves!, onback: () => {} });
    const fraction = container.querySelector('.text .fraction');
    expect(fraction?.querySelector('.numerator')?.textContent).toBe('1');
    expect(fraction?.querySelector('.denominator')?.textContent).toBe('2');
  });

  it('renders a table', () => {
    render(LessonView, { topic: halves!, onback: () => {} });
    const headers = screen.getAllByRole('columnheader').map((c) => c.textContent);
    const cells = screen.getAllByRole('cell').map((c) => c.textContent);
    expect(headers).toEqual(['Som', 'Uitkomst']);
    expect(cells).toEqual(['5 × 8', '40', '5 × 12', '60']);
  });

  it('goes back', async () => {
    const onback = vi.fn();
    render(LessonView, { topic: splitting!, onback });
    await fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(onback).toHaveBeenCalledOnce();
  });
});
