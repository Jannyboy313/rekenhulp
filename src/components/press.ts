import type { ActionReturn } from 'svelte/action';

/**
 * Runs the handler as soon as a key goes down, not on release, so typing feels immediate
 * (spec §6). Keyboard activation still works: it fires a click with detail 0. The click that
 * follows a pointer press has detail ≥ 1 and is ignored, so one press never counts twice.
 */
export function press(node: HTMLButtonElement, handler: () => void): ActionReturn<() => void> {
  let current = handler;
  const onPointerDown = (event: PointerEvent) => {
    // Primary button only. Disabled buttons can still receive pointer events in some browsers.
    if (event.button > 0 || node.disabled) return;
    current();
  };
  const onClick = (event: MouseEvent) => {
    if (event.detail === 0) current();
  };
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('click', onClick);
  return {
    update(next) {
      current = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('click', onClick);
    },
  };
}
