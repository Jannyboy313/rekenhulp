import { describe, expect, it } from 'vitest';
import { isLandscape, isTablet, resolveLayout, type Layout } from './layout';

describe('resolveLayout (v4 spec §3.1)', () => {
  it.each<[number, number, Layout]>([
    [360, 780, 'phone'],
    [599, 960, 'phone'],
    [600, 960, 'tablet-portrait'],
    [800, 1280, 'tablet-portrait'],
    [800, 800, 'tablet-portrait'],
    [1280, 800, 'tablet-landscape'],
    [900, 720, 'tablet-landscape'],
    [960, 600, 'tablet-landscape-compact'],
    [900, 719, 'tablet-landscape-compact'],
    [900, 520, 'tablet-landscape-compact'],
    [900, 519, 'too-low'],
    [780, 360, 'too-low'],
    [899, 639, 'too-low'],
    [899, 640, 'phone'],
    [800, 700, 'phone'],
  ])('%i × %i is %s', (width, height, expected) => {
    expect(resolveLayout(width, height)).toBe(expected);
  });
});

describe('layout kinds', () => {
  it.each<[Layout, boolean, boolean]>([
    ['phone', false, false],
    ['too-low', false, false],
    ['tablet-portrait', true, false],
    ['tablet-landscape', true, true],
    ['tablet-landscape-compact', true, true],
  ])('%s: tablet %j, landscape %j', (layout, tablet, landscape) => {
    expect(isTablet(layout)).toBe(tablet);
    expect(isLandscape(layout)).toBe(landscape);
  });
});
