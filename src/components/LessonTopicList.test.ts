// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_LESSON } from '../lib/lessons/fixture';
import { TABLES_SET } from '../lib/sets';
import LessonTopicList from './LessonTopicList.svelte';

function renderList() {
  const onselect = vi.fn();
  const onback = vi.fn();
  render(LessonTopicList, { set: TABLES_SET, lesson: FIXTURE_LESSON, onselect, onback });
  return { onselect, onback };
}

describe('LessonTopicList', () => {
  it('shows the set name and one row per topic with title and summary', () => {
    renderList();
    expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();
    const rows = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label') === null);
    expect(rows).toHaveLength(FIXTURE_LESSON.topics.length);
    FIXTURE_LESSON.topics.forEach((topic, i) => {
      expect(rows[i]!.textContent).toContain(topic.title);
      // A stacked fraction keeps its hidden slash, so '1/2' still reads as text.
      expect(rows[i]!.textContent).toContain(topic.summary);
    });
  });

  it('opens the clicked topic', async () => {
    const { onselect } = renderList();
    await fireEvent.click(screen.getByRole('button', { name: /^Halveren/ }));
    expect(onselect).toHaveBeenCalledWith(FIXTURE_LESSON.topics[1]);
  });

  it('goes back', async () => {
    const { onback } = renderList();
    await fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(onback).toHaveBeenCalledOnce();
  });
});
