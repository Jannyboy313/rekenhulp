// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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

  it('stacks the ½ of 12½% next to the whole part and reads it as a mixed number', () => {
    const { container } = render(MathText, { props: { text: '12½% van 80 = ?' } });
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
