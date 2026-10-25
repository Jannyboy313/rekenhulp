// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { PRACTICE_SETS } from '../lib/sets';
import SetGlyph from './SetGlyph.svelte';

describe('SetGlyph', () => {
  it.each(PRACTICE_SETS)('draws a hidden 28 × 28 svg for $name', (set) => {
    const { container } = render(SetGlyph, { id: set.id, name: set.name });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 28 28');
  });

  it('falls back to the first letter for an unknown id', () => {
    const { container } = render(SetGlyph, { id: 'x', name: 'Xyz' });
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('X');
  });
});
