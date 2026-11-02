// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_LESSON } from '../lib/lessons/fixture';
import LessonLinks from './LessonLinks.svelte';

const [SPLITTING, HALVES] = FIXTURE_LESSON.topics;

describe('LessonLinks', () => {
  it('is one button named after the lesson topic, with hidden icons', () => {
    render(LessonLinks, { topics: [SPLITTING!], onopen: vi.fn() });
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('Les: Grote tafels splitsen');
    expect(button.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  });

  it('opens the topic it names, passing its button', async () => {
    const onopen = vi.fn();
    render(LessonLinks, { topics: [SPLITTING!, HALVES!], onopen });
    const button = screen.getByRole('button', { name: 'Les: Halveren' });
    await fireEvent.click(button);
    expect(onopen).toHaveBeenCalledWith(HALVES, button);
  });

  it('has no dots for one topic', () => {
    const { container } = render(LessonLinks, { topics: [SPLITTING!], onopen: vi.fn() });
    expect(container.querySelector('.dots')).toBeNull();
  });

  it('shows a hidden dot per topic, the first active, when there are several', () => {
    const { container } = render(LessonLinks, {
      topics: [SPLITTING!, HALVES!],
      onopen: vi.fn(),
    });
    const dots = container.querySelector('.dots');
    expect(dots?.getAttribute('aria-hidden')).toBe('true');
    const active = [...container.querySelectorAll('.dot')].map((dot) =>
      dot.classList.contains('active'),
    );
    expect(active).toEqual([true, false]);
  });

  it('moves the active dot with the scrolled page', async () => {
    const { container } = render(LessonLinks, {
      topics: [SPLITTING!, HALVES!],
      onopen: vi.fn(),
    });
    const row = container.querySelector('.row') as HTMLElement;
    Object.defineProperty(row, 'clientWidth', { value: 300 });
    row.scrollLeft = 290;
    await fireEvent.scroll(row);
    const active = [...container.querySelectorAll('.dot')].map((dot) =>
      dot.classList.contains('active'),
    );
    expect(active).toEqual([false, true]);
  });
});
