// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { SLOT } from '../lib/slot';
import MathText from './MathText.svelte';

describe('MathText', () => {
  it('renders plain text as is', () => {
    const { container } = render(MathText, { props: { text: '3 × 4 = ?' } });
    expect(container.textContent).toBe('3 × 4 = ?');
    expect(container.querySelector('.fraction')).toBeNull();
  });

  it('stacks a fraction and keeps a hidden slash for screen readers', () => {
    const { container } = render(MathText, { props: { text: '12,5 of 25/2' } });
    const fraction = container.querySelector('.fraction');
    expect(fraction?.querySelector('.numerator')?.textContent).toBe('25');
    expect(fraction?.querySelector('.denominator')?.textContent).toBe('2');
    expect(fraction?.querySelector('.sr-only')?.textContent).toBe('/');
    expect(container.textContent).toBe('12,5 of 25/2');
  });

  it('stacks the 1/2 of 12 1/2% next to the whole part and reads it as a mixed number', () => {
    const { container } = render(MathText, { props: { text: '12 1/2% van 80 = ?' } });
    expect(container.querySelector('.numerator')?.textContent).toBe('1');
    expect(container.querySelector('.denominator')?.textContent).toBe('2');
    expect(container.textContent).toBe('12 en 1/2% van 80 = ?');
  });

  it('drops the visible space of a mixed number', () => {
    const { container } = render(MathText, { props: { text: '−12 1/2' } });
    expect(container.textContent).toBe('−12 en 1/2');
  });

  it('keeps the minus of a negative fraction without a hidden en', () => {
    const { container } = render(MathText, { props: { text: '−3/4' } });
    expect(container.textContent).toBe('−3/4');
    expect(container.querySelectorAll('.fraction')).toHaveLength(1);
  });
});

describe('MathText slot', () => {
  const sum = '7 × ' + SLOT + ' = 56';

  it('renders an uncoloured ? by default', () => {
    const { container } = render(MathText, { props: { text: sum } });
    expect(container.textContent).toBe('7 × ? = 56');
    const slot = container.querySelector('.slot');
    expect(slot?.textContent).toBe('?');
    for (const tone of ['primary', 'good', 'bad']) expect(slot?.classList.contains(tone)).toBe(false);
  });

  it.each(['primary', 'bad'] as const)('puts the ? in .slot.%s', (tone) => {
    const { container } = render(MathText, { props: { text: sum, slot: { tone } } });
    expect(container.querySelector(`.slot.${tone}`)?.textContent).toBe('?');
  });

  it('fills the slot with a value', () => {
    const { container } = render(MathText, { props: { text: sum, slot: { tone: 'good', fill: '8' } } });
    expect(container.textContent).toBe('7 × 8 = 56');
    expect(container.querySelector('.slot.good')?.textContent).toBe('8');
  });

  it('never wraps a literal question mark', () => {
    const { container } = render(MathText, {
      props: { text: 'Hoeveel busjes zijn er nodig?', slot: { tone: 'bad', fill: '3' } },
    });
    expect(container.textContent).toBe('Hoeveel busjes zijn er nodig?');
    expect(container.querySelector('.slot')).toBeNull();
  });

  it('keeps a slot inside a fraction stacked', () => {
    const { container } = render(MathText, {
      props: { text: '3/4 = ' + SLOT + '/12', slot: { tone: 'good', fill: '9' } },
    });
    const plain = render(MathText, { props: { text: '3/4 = 9/12' } });
    expect(container.textContent).toBe(plain.container.textContent);
    expect(container.querySelectorAll('.fraction')).toHaveLength(2);
    expect(container.querySelector('.numerator .slot.good')?.textContent).toBe('9');
  });

  it('draws a mixed number as the fill without extra spaces', () => {
    const { container } = render(MathText, {
      props: { text: '7 × ' + SLOT + ' = 10 1/2', slot: { tone: 'good', fill: '1 1/2' } },
    });
    const plain = render(MathText, { props: { text: '7 × 1 1/2 = 10 1/2' } });
    expect(container.textContent).toBe(plain.container.textContent);
    expect(container.querySelector('.slot .fraction')).not.toBeNull();
  });

  it('keeps the fill as typed', () => {
    const { container } = render(MathText, {
      props: { text: '0,2 + 0,3 = ' + SLOT, slot: { tone: 'good', fill: '0,50' } },
    });
    expect(container.textContent).toBe('0,2 + 0,3 = 0,50');
  });
});
