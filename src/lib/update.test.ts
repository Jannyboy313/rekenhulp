import { describe, expect, it, vi } from 'vitest';
import { createUpdates, shouldPrompt } from './update';

describe('shouldPrompt', () => {
  const screens = ['sets', 'setup', 'lessonTopics', 'lesson', 'playing', 'results'];

  it.each([
    ['sets', true],
    ['setup', true],
    ['lessonTopics', false],
    ['lesson', false],
    ['playing', false],
    ['results', false],
  ])('shows on %s only when allowed: %s', (screen, expected) => {
    expect(shouldPrompt({ available: true, dismissed: false }, screen)).toBe(expected);
  });

  it('never shows without a waiting update or after Later', () => {
    for (const screen of screens) {
      expect(shouldPrompt({ available: false, dismissed: false }, screen)).toBe(false);
      expect(shouldPrompt({ available: true, dismissed: true }, screen)).toBe(false);
    }
  });
});

describe('createUpdates', () => {
  it('starts without an update and notifies subscribers with the current state at once', () => {
    const updates = createUpdates(vi.fn());
    const seen: unknown[] = [];
    updates.subscribe((s) => seen.push(s));
    expect(seen).toEqual([{ available: false, dismissed: false }]);
  });

  it('marks an update as available', () => {
    const updates = createUpdates(vi.fn());
    const fn = vi.fn();
    updates.subscribe(fn);
    updates.needRefresh();
    expect(fn).toHaveBeenLastCalledWith({ available: true, dismissed: false });
  });

  it('keeps the update after Later, and offers it again on resume', () => {
    const updates = createUpdates(vi.fn());
    const fn = vi.fn();
    updates.subscribe(fn);
    updates.needRefresh();
    updates.dismiss();
    expect(fn).toHaveBeenLastCalledWith({ available: true, dismissed: true });
    updates.resume();
    expect(fn).toHaveBeenLastCalledWith({ available: true, dismissed: false });
  });

  it('does not notify on resume when nothing changes', () => {
    const updates = createUpdates(vi.fn());
    const fn = vi.fn();
    updates.subscribe(fn);
    fn.mockClear();
    updates.resume();
    expect(fn).not.toHaveBeenCalled();
  });

  it('installs through the given callback', () => {
    const install = vi.fn();
    createUpdates(install).install();
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const updates = createUpdates(vi.fn());
    const fn = vi.fn();
    const stop = updates.subscribe(fn);
    stop();
    fn.mockClear();
    updates.needRefresh();
    expect(fn).not.toHaveBeenCalled();
  });
});
