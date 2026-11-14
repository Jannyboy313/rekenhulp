import { resolveLayout, type Layout } from '../lib/layout';

/** A layout a screen can be drawn in: every layout but the notice. */
export type ShownLayout = Exclude<Layout, 'too-low'>;

interface Viewport {
  layout: Layout;
  /** The last layout that is not `too-low`: the screen under the notice keeps it (v4 spec §3.2). */
  shown: ShownLayout;
  height: number;
}

/**
 * The current layout, shared by the components that show a different presentation per layout.
 * Until `watchViewport` runs (component tests) it is a phone of unlimited height.
 */
export const viewport: Viewport = $state({
  layout: 'phone',
  shown: 'phone',
  height: Number.POSITIVE_INFINITY,
});

/** Keeps `viewport` and `data-layout` on `root` in step with the window; returns the clean-up. */
export function watchViewport(win: Window, root: HTMLElement): () => void {
  const update = () => {
    const layout = resolveLayout(win.innerWidth, win.innerHeight);
    viewport.layout = layout;
    // The screen under the notice does not reflow: it keeps its layout and its height.
    if (layout !== 'too-low') {
      viewport.shown = layout;
      viewport.height = win.innerHeight;
    }
    root.dataset.layout = viewport.shown;
  };
  update();
  // Also fires on an orientation change.
  win.addEventListener('resize', update);
  return () => win.removeEventListener('resize', update);
}
