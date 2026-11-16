import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Topic } from '../types';
import { GENERATORS } from './index';

const SEEDS = 1000;

/** Plural nouns that follow a count in a prompt or an explanation. */
const PLURALS = [
  'jongens',
  'meisjes',
  'bladzijden',
  'bezoekers',
  'inwoners',
  'appels',
  'peren',
  'eieren',
  'leerlingen',
  'gasten',
  'kaartjes',
  'zakjes',
  'stukken',
  'busjes',
  'tafels',
  'dozen',
  'eenheden',
  '\\p{Ll}*tallen',
];

// A count of exactly 1: not the end of a longer number (`21`, `0,1`, `2 001`) or of a fraction.
const ONE_PLURAL = new RegExp(`(?<![\\d,/\\s])\\s?\\b1 (?:${PLURALS.join('|')})(?!\\p{L})`, 'u');

describe.each(Object.keys(GENERATORS) as Topic[])('grammar sweep: %s', (topic) => {
  it('never writes a plural noun after the count 1', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const step of GENERATORS[topic](createRng(seed)).steps) {
        expect(step.prompt).not.toMatch(ONE_PLURAL);
        expect(step.check('').explanation ?? '').not.toMatch(ONE_PLURAL);
      }
    }
  });
});
