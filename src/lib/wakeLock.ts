/** The parts of the Screen Wake Lock API used here, so tests can pass fakes. */
interface WakeLockSentinelLike {
  readonly released: boolean;
  release(): Promise<unknown>;
}

export interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

interface VisibilitySource extends EventTarget {
  readonly visibilityState: DocumentVisibilityState;
}

/**
 * Keeps the screen on until the returned stop function is called (spec §2). The system drops
 * the lock while the page is hidden, so it is requested again when the page is visible again.
 * A missing API or a refused request is not an error: the screen then just may turn off.
 */
export function keepScreenAwake(
  wakeLock: WakeLockLike | undefined,
  doc: VisibilitySource,
): () => void {
  if (!wakeLock) return () => {};
  let sentinel: WakeLockSentinelLike | null = null;
  let requesting = false;
  let stopped = false;

  function acquire() {
    if (requesting || (sentinel && !sentinel.released)) return;
    requesting = true;
    wakeLock!.request('screen').then(
      (lock) => {
        requesting = false;
        if (stopped) void lock.release();
        else sentinel = lock;
      },
      () => {
        requesting = false;
      },
    );
  }

  function onVisibilityChange() {
    if (doc.visibilityState === 'visible') acquire();
  }

  acquire();
  doc.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    stopped = true;
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    void sentinel?.release();
    sentinel = null;
  };
}
