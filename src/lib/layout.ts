/** The layouts of v4 spec §3.1. `too-low` shows a notice instead of a screen (§3.3). */
export type Layout =
  'phone' | 'tablet-portrait' | 'tablet-landscape' | 'tablet-landscape-compact' | 'too-low';

/** Landscape below this height has no room for any layout. */
const MIN_LANDSCAPE_HEIGHT = 520;
/** What the phone column needs for the play screen with one kladblok row. */
const MIN_COLUMN_HEIGHT = 640;
const TABLET_LANDSCAPE_WIDTH = 900;
const COMPACT_HEIGHT = 720;
const TABLET_PORTRAIT_WIDTH = 600;

/** The layout for a viewport in CSS px (after system bars). */
export function resolveLayout(width: number, height: number): Layout {
  if (width > height) {
    if (height < MIN_LANDSCAPE_HEIGHT) return 'too-low';
    if (width >= TABLET_LANDSCAPE_WIDTH) {
      return height < COMPACT_HEIGHT ? 'tablet-landscape-compact' : 'tablet-landscape';
    }
    // Split screen on a large tablet: the phone column, if it fits.
    return height < MIN_COLUMN_HEIGHT ? 'too-low' : 'phone';
  }
  return width >= TABLET_PORTRAIT_WIDTH ? 'tablet-portrait' : 'phone';
}

export function isLandscape(layout: Layout): boolean {
  return layout === 'tablet-landscape' || layout === 'tablet-landscape-compact';
}

export function isTablet(layout: Layout): boolean {
  return layout === 'tablet-portrait' || isLandscape(layout);
}
