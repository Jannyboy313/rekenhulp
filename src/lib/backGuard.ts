/** The part of `window.history` the guard uses, so tests can pass a fake. */
interface HistoryLike {
  pushState(data: unknown, unused: string): void;
  back(): void;
}

interface BackGuard {
  /** Keeps one entry above the current one, so a system back stays inside the app. */
  arm(): void;
  /** Removes the entry again, when the app returns to its start screen by itself. */
  disarm(): void;
  /** Call on every `popstate`: true when it was a system back that consumed the entry. */
  popped(): boolean;
}

/**
 * Turns the system back action (Android back, iOS swipe back) into an in-app event instead of
 * closing the app (spec §3). Holds at most one history entry.
 */
export function createBackGuard(history: HistoryLike): BackGuard {
  let armed = false;
  return {
    arm() {
      if (armed) return;
      armed = true;
      history.pushState({ backGuard: true }, '');
    },
    disarm() {
      if (!armed) return;
      // Cleared first, so the popstate this back causes is not reported as a system back.
      armed = false;
      history.back();
    },
    popped() {
      if (!armed) return false;
      armed = false;
      return true;
    },
  };
}
