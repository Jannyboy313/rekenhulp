import { vi } from 'vitest';

/**
 * Stubs the global matchMedia, which jsdom lacks. Every query starts unmatched; `change` sets
 * one and notifies its listeners. Undo with `vi.unstubAllGlobals()`.
 */
export function stubMatchMedia() {
  const lists = new Map<string, { matches: boolean; listeners: Set<() => void> }>();
  const listOf = (query: string) => {
    const list = lists.get(query) ?? { matches: false, listeners: new Set<() => void>() };
    lists.set(query, list);
    return list;
  };
  vi.stubGlobal('matchMedia', (query: string) => {
    const list = listOf(query);
    return {
      get matches() {
        return list.matches;
      },
      addEventListener: (_type: string, listener: () => void) => list.listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => list.listeners.delete(listener),
    };
  });
  return {
    change(query: string, matches: boolean) {
      const list = listOf(query);
      list.matches = matches;
      for (const listener of list.listeners) listener();
    },
    listenerCount: () => [...lists.values()].reduce((sum, list) => sum + list.listeners.size, 0),
  };
}
