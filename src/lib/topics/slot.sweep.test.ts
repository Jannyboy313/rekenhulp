import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { hasSlot, SLOT } from '../slot';
import type { Topic } from '../types';
import { GENERATORS } from './index';

const SEEDS = 1000;

const TOPICS = Object.keys(GENERATORS) as Topic[];

function prompts(topic: Topic): string[] {
  const generate = GENERATORS[topic];
  const result: string[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const step of generate(createRng(seed)).steps) result.push(step.prompt);
  }
  return result;
}

describe.each(TOPICS)('slot sweep: %s', (topic) => {
  const all = prompts(topic);

  it('never puts the marker in a question key', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      expect(GENERATORS[topic](createRng(seed)).key).not.toContain(SLOT);
    }
  });

  it('has at most one slot per prompt', () => {
    for (const prompt of all) {
      expect(prompt.split(SLOT).length - 1, prompt).toBeLessThanOrEqual(1);
    }
  });

  // A real question mark ends a sentence: the end of the prompt, or before a new sentence
  // ('Hoe groot is de omtrek? Neem π = 3,14.'). An unknown written as '?' never does.
  it('uses a literal ? only as a sentence end', () => {
    for (const prompt of all) {
      for (const match of prompt.matchAll(/\?/g)) {
        const rest = prompt.slice((match.index ?? 0) + 1);
        expect(/^$|^ \p{Lu}/u.test(rest), prompt).toBe(true);
      }
    }
  });
});

describe('slot sweep: which prompts carry the unknown', () => {
  it.each<Topic>(['lcm', 'gcd', 'length', 'scale', 'fractionArithmetic', 'powersRoots', 'tables'])(
    '%s has prompts with a slot',
    (topic) => {
      expect(prompts(topic).some(hasSlot)).toBe(true);
    },
  );

  it.each<Topic>(['ratioProblems', 'angles', 'divisibility', 'shapeProperties', 'symmetry'])(
    '%s never has a slot',
    (topic) => {
      expect(prompts(topic).some(hasSlot)).toBe(false);
    },
  );

  it('properties has a slot in its evaluation step but never in its rewrite step', () => {
    const generate = GENERATORS.properties;
    let evaluation = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const step of generate(createRng(seed)).steps) {
        if (step.kind === 'expression') expect(hasSlot(step.prompt)).toBe(false);
        else if (hasSlot(step.prompt)) evaluation++;
      }
    }
    expect(evaluation).toBeGreaterThan(0);
  });
});
