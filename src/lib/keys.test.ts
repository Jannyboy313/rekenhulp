import { describe, expect, it } from 'vitest';
import { INPUT_MODELS, type KeypadKind } from './inputModels';
import { keyDefs, KEYS, okSpan } from './keys';
import { NOTE_KEYS } from './scratchpad';

describe('KEYS', () => {
  it('has one definition per key, under its own key', () => {
    for (const [key, def] of Object.entries(KEYS)) expect(def.key).toBe(key);
  });

  it('labels the keys like the spec', () => {
    expect(KEYS['7']).toEqual({ key: '7', label: '7' });
    expect(KEYS['-']).toEqual({ key: '-', label: '−', ariaLabel: 'min' });
    expect(KEYS['/']).toEqual({ key: '/', label: 'breuk', icon: 'fraction' });
    expect(KEYS[' ']).toEqual({ key: ' ', label: '␣', ariaLabel: 'spatie' });
    expect(KEYS.backspace).toEqual({ key: 'backspace', label: '⌫', ariaLabel: 'wissen' });
  });
});

describe('keyDefs', () => {
  it('looks up the keys in the given order', () => {
    expect(keyDefs('1', '+', 'backspace')).toEqual([KEYS['1'], KEYS['+'], KEYS.backspace]);
  });
});

describe('keypads', () => {
  const keypads: [string, readonly { key: string }[]][] = [
    ...(Object.keys(INPUT_MODELS) as KeypadKind[]).map(
      (kind) => [kind, INPUT_MODELS[kind].keys] as [string, readonly { key: string }[]],
    ),
    ['kladblok', NOTE_KEYS],
  ];

  // Keypad.svelte keys its #each on the key, so a duplicate would throw at render time.
  it.each(keypads)('%s has every key at most once', (_, keys) => {
    const names = keys.map(({ key }) => key);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('okSpan', () => {
  it('lets OK fill the last row of the 3-column grid', () => {
    expect(okSpan(INPUT_MODELS.number.keys)).toBe(2);
    expect(okSpan(INPUT_MODELS.fraction.keys)).toBe(1);
    expect(okSpan(INPUT_MODELS.factorization.keys)).toBe(2);
  });

  it('lets OK fill the last row of the 4-column expression grid', () => {
    expect(okSpan(INPUT_MODELS.expression.keys, 4)).toBe(3);
  });

  it('gives OK a row of its own when the keys fill the last row', () => {
    expect(okSpan(keyDefs('1', '2', '3'))).toBe(3);
  });
});
