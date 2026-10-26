export interface UpdateState {
  /** A new version is waiting in the service worker. */
  available: boolean;
  /** The user chose Later; reset on the next resume. */
  dismissed: boolean;
}

/** Screens where the update dialog may show; never during a session or a lesson (spec §2). */
const PROMPT_SCREENS: readonly string[] = ['sets', 'setup'];

export function shouldPrompt(state: UpdateState, screen: string): boolean {
  return state.available && !state.dismissed && PROMPT_SCREENS.includes(screen);
}

export interface Updates {
  /** Calls `listener` at once and on every change; returns the unsubscribe function. */
  subscribe(listener: (state: UpdateState) => void): () => void;
  /** The service worker has a new version waiting. */
  needRefresh(): void;
  /** Later: hide the dialog until the next resume. */
  dismiss(): void;
  /** The app became visible again: offer a waiting update again. */
  resume(): void;
  /** Activates the waiting version; `activate` reloads the app. */
  install(): void;
}

/** Holds the update state outside Svelte, so `main.ts` can feed it and `App.svelte` can read it. */
export function createUpdates(activate: () => void): Updates {
  let state: UpdateState = { available: false, dismissed: false };
  const listeners = new Set<(state: UpdateState) => void>();

  function set(next: UpdateState) {
    if (next.available === state.available && next.dismissed === state.dismissed) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    needRefresh: () => set({ available: true, dismissed: false }),
    dismiss: () => set({ ...state, dismissed: true }),
    resume: () => set({ ...state, dismissed: false }),
    install: activate,
  };
}
