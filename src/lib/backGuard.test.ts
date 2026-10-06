import { describe, expect, it, vi } from 'vitest';
import { createBackGuard } from './backGuard';

function fakeHistory() {
  return { pushState: vi.fn(), back: vi.fn() };
}

describe('createBackGuard', () => {
  it('pushes one history entry when armed, also when armed twice', () => {
    const history = fakeHistory();
    const guard = createBackGuard(history);
    guard.arm();
    guard.arm();
    expect(history.pushState).toHaveBeenCalledTimes(1);
  });

  it('reports a popstate as back only while armed', () => {
    const guard = createBackGuard(fakeHistory());
    expect(guard.popped()).toBe(false);
    guard.arm();
    expect(guard.popped()).toBe(true);
    // The entry is consumed, so the next popstate leaves the app as usual.
    expect(guard.popped()).toBe(false);
  });

  it('removes its own entry when disarmed, and ignores the popstate that follows', () => {
    const history = fakeHistory();
    const guard = createBackGuard(history);
    guard.arm();
    guard.disarm();
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(guard.popped()).toBe(false);
  });

  it('does not go back when disarmed without an entry', () => {
    const history = fakeHistory();
    const guard = createBackGuard(history);
    guard.disarm();
    guard.arm();
    guard.popped();
    guard.disarm();
    expect(history.back).not.toHaveBeenCalled();
  });

  it('can be armed again after a back', () => {
    const history = fakeHistory();
    const guard = createBackGuard(history);
    guard.arm();
    guard.popped();
    guard.arm();
    expect(history.pushState).toHaveBeenCalledTimes(2);
    expect(guard.popped()).toBe(true);
  });
});
