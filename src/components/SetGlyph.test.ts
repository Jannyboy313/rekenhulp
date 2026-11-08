// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { MIXED_SET, PRACTICE_SETS } from '../lib/sets';
import SetGlyph from './SetGlyph.svelte';

describe('SetGlyph', () => {
  it.each(PRACTICE_SETS)('draws a hidden 28 × 28 svg for $name', (set) => {
    const { container } = render(SetGlyph, { id: set.id, name: set.name });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 28 28');
  });

  it('draws Gemengd as a 2 × 2 grid of tiles in violet, amber, blue and violet', () => {
    const { container } = render(SetGlyph, { id: MIXED_SET.id, name: MIXED_SET.name });
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 28 28');
    const colour = (rect: Element) => ['fv', 'fa', 'fb'].find((c) => rect.classList.contains(c));
    expect([...container.querySelectorAll('rect')].map(colour)).toEqual(['fv', 'fa', 'fb', 'fv']);
  });

  it('falls back to the first letter for an unknown id', () => {
    const { container } = render(SetGlyph, { id: 'x', name: 'Xyz' });
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('X');
  });
});
