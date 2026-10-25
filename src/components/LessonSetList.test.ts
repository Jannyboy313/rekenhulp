// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_LESSON } from '../lib/lessons/fixture';
import { PRACTICE_SETS, TABLES_SET } from '../lib/sets';
import LessonSetList from './LessonSetList.svelte';

function rows(): HTMLButtonElement[] {
  return screen.getAllByRole<HTMLButtonElement>('button');
}

describe('LessonSetList', () => {
  it('shows every set with its name, description and glyph, disabled without a lesson', () => {
    render(LessonSetList, { sets: PRACTICE_SETS, lessons: [], onopen: () => {} });
    expect(rows()).toHaveLength(PRACTICE_SETS.length);
    PRACTICE_SETS.forEach((set, i) => {
      const row = rows()[i]!;
      expect(row.textContent).toContain(set.name);
      expect(row.textContent).toContain(set.description);
      expect(row.querySelector('svg')).not.toBeNull();
      expect(row.disabled).toBe(true);
    });
  });

  it('enables the sets with a lesson and opens it', async () => {
    const onopen = vi.fn();
    render(LessonSetList, { sets: PRACTICE_SETS, lessons: [FIXTURE_LESSON], onopen });
    expect(rows().filter((row) => !row.disabled)).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: /^Tafels/ }));
    expect(onopen).toHaveBeenCalledWith(TABLES_SET, FIXTURE_LESSON);
  });
});
