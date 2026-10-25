// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Icon, { type IconName } from './Icon.svelte';

const NAMES: IconName[] = [
  'chevron-left',
  'chevron-right',
  'close',
  'check',
  'cross',
  'pen',
  'repeat',
  'bulb',
];

describe('Icon', () => {
  it.each(NAMES)('renders %s as a hidden svg', (name) => {
    const { container } = render(Icon, { name });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });
});
