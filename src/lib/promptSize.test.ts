import { describe, expect, it } from 'vitest';
import { displayLength, promptSize } from './promptSize';

describe('displayLength', () => {
  it.each([
    ['', 0],
    ['7 × 8 = ?', 9],
    // A stacked fraction is as wide as its widest line.
    ['25/2', 2],
    ['3/4 + 1/8 = ?', 9],
    // The space of a mixed number is dropped, ½ is one fraction.
    ['−12 1/2', 4],
    ['12½% van 80 = ?', 15],
  ])('%j is %i characters wide', (text, length) => {
    expect(displayLength(text)).toBe(length);
  });
});

describe('promptSize', () => {
  it.each([
    ['7 × 8 = ?', 'large'],
    ['3,5 km = ? m', 'large'],
    // 18 characters, the last large one.
    ['123 456 + 78 = ? m', 'large'],
    // 19 characters, the first medium one.
    ['123 456 + 789 = ? m', 'medium'],
    ['KGV van 12 en 18 = ?', 'medium'],
    // 40 characters, the last medium one.
    ['Pas de verdelende eigenschap toe: 6 × 99', 'medium'],
    // 41 characters, the first small one.
    ['Pas de verdelende eigenschap toe: 6 × 199', 'small'],
    ['Verdeel 360 in de verhouding 2 : 3. Hoe groot is het grootste deel?', 'small'],
  ])('%j is %s', (text, size) => {
    expect(promptSize(text)).toBe(size);
  });

  it('measures fractions by their stacked width', () => {
    // 19 characters as typed, 13 as displayed.
    expect(promptSize('1/2 + 1/3 + 1/4 = ?')).toBe('large');
  });
});
