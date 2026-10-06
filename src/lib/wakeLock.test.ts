import { describe, expect, it, vi } from 'vitest';
import { keepScreenAwake, type WakeLockLike } from './wakeLock';

function fakeSentinel() {
  const sentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
    }),
  };
  return sentinel;
}

function fakeWakeLock() {
  const sentinels: ReturnType<typeof fakeSentinel>[] = [];
  const wakeLock = {
    request: vi.fn(async () => {
      const sentinel = fakeSentinel();
      sentinels.push(sentinel);
      return sentinel;
    }),
  } satisfies WakeLockLike;
  return { wakeLock, sentinels };
}

function fakeDocument(visibilityState: DocumentVisibilityState = 'visible') {
  const target = new EventTarget();
  return Object.assign(target, { visibilityState });
}

/** Lets pending request promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('keepScreenAwake', () => {
  it('requests a screen lock and releases it on stop', async () => {
    const { wakeLock, sentinels } = fakeWakeLock();
    const stop = keepScreenAwake(wakeLock, fakeDocument());
    await settle();
    expect(wakeLock.request).toHaveBeenCalledWith('screen');
    stop();
    expect(sentinels[0]!.release).toHaveBeenCalled();
  });

  it('does nothing where the API is missing', () => {
    expect(() => keepScreenAwake(undefined, fakeDocument())()).not.toThrow();
  });

  it('keeps working when the request is refused', async () => {
    const wakeLock = { request: vi.fn(() => Promise.reject(new Error('NotAllowedError'))) };
    const stop = keepScreenAwake(wakeLock, fakeDocument());
    await settle();
    expect(() => stop()).not.toThrow();
  });

  it('requests a new lock when the page becomes visible after the system released it', async () => {
    const { wakeLock, sentinels } = fakeWakeLock();
    const doc = fakeDocument();
    keepScreenAwake(wakeLock, doc);
    await settle();

    sentinels[0]!.released = true;
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(wakeLock.request).toHaveBeenCalledTimes(1);

    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it('does not request a second lock while the first is still held', async () => {
    const { wakeLock } = fakeWakeLock();
    const doc = fakeDocument();
    keepScreenAwake(wakeLock, doc);
    await settle();
    doc.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it('does not request a second lock while the first request is pending', async () => {
    const { wakeLock } = fakeWakeLock();
    const doc = fakeDocument();
    keepScreenAwake(wakeLock, doc);
    doc.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it('releases a lock that arrives after stop, and stops listening', async () => {
    const { wakeLock, sentinels } = fakeWakeLock();
    const doc = fakeDocument();
    const stop = keepScreenAwake(wakeLock, doc);
    stop();
    await settle();
    expect(sentinels[0]!.release).toHaveBeenCalled();

    doc.dispatchEvent(new Event('visibilitychange'));
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
  });
});
