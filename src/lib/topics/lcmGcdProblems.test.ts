import { describe, expect, it } from 'vitest';
import { gcd, lcm } from '../primes';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import type { Question } from '../types';
import {
  generateLcmGcdProblems,
  lcmGcdExplanation,
  lcmGcdPrompt,
  type Context,
} from './lcmGcdProblems';
import { answerOf, stepOf } from './testHelpers';

const SAMPLES = 4000;

function sample(seed: number): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateLcmGcdProblems(rng));
}

/** key: lcmGcdProblems:<kind>:<context>:<numbers ascending> */
function parts(question: Question): { kind: string; context: string; numbers: number[] } {
  const [, kind, context, ...numbers] = question.key.split(':');
  return { kind: kind!, context: context!, numbers: numbers.map(Number) };
}

const questions = sample(59);

describe('lcmGcdProblems', () => {
  it('accepts its own answer, with the suffix of its context', () => {
    const suffixes: Record<string, string> = {
      bus: 'min',
      lampen: 's',
      groepjes: 'kinderen',
      planken: 'cm',
      fruit: 'schalen',
      tegels: 'cm',
    };
    for (const question of questions) {
      const { kind, context, numbers } = parts(question);
      const step = stepOf(question);
      expect(question.topic).toBe('lcmGcdProblems');
      expect(step.kind).toBe('number');
      expect(step.suffix).toBe(suffixes[context]);
      const answer = kind === 'kgv' ? numbers.reduce(lcm) : numbers.reduce(gcd);
      expect(answerOf(question)).toEqual(fromInteger(answer));
      expect(step.check(String(answer)).correct).toBe(true);
      expect(step.check(String(answer + 1)).correct).toBe(false);
    }
  });

  it('uses KGV and GGD equally and every context', () => {
    const counts: Record<string, number> = {};
    for (const question of questions) {
      const { kind, context } = parts(question);
      counts[kind] = (counts[kind] ?? 0) + 1;
      counts[context] = (counts[context] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(
      ['bus', 'fruit', 'groepjes', 'kgv', 'ggd', 'lampen', 'planken', 'tegels'].sort(),
    );
    expect(counts.kgv! / SAMPLES).toBeGreaterThan(0.45);
    expect(counts.kgv! / SAMPLES).toBeLessThan(0.55);
    for (const context of ['bus', 'lampen', 'groepjes', 'planken', 'fruit', 'tegels']) {
      expect(counts[context]! / SAMPLES).toBeGreaterThan(0.13);
      expect(counts[context]! / SAMPLES).toBeLessThan(0.2);
    }
  });

  it('keeps the KGV terms and results in range (bus, lampen)', () => {
    const rows = questions.map(parts).filter((p) => p.context === 'bus' || p.context === 'lampen');
    expect(rows.length).toBeGreaterThan(1000);
    let shared = 0;
    for (const { numbers } of rows) {
      const [a, b] = numbers as [number, number];
      expect(numbers).toHaveLength(2);
      expect(a).toBeGreaterThanOrEqual(4);
      expect(b).toBeLessThanOrEqual(30);
      expect(a).not.toBe(b);
      expect(lcm(a, b)).toBeLessThanOrEqual(120);
      if (gcd(a, b) > 1) shared++;
    }
    expect(shared / rows.length).toBeGreaterThan(0.7);
    expect(shared / rows.length).toBeLessThan(0.8);
  });

  it('keeps groepjes in [2, 12] with lcm at most 60 and sometimes three sizes', () => {
    const rows = questions.map(parts).filter((p) => p.context === 'groepjes');
    let three = 0;
    for (const { numbers } of rows) {
      expect(numbers.length === 2 || numbers.length === 3).toBe(true);
      expect(new Set(numbers).size).toBe(numbers.length);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(12);
      }
      expect(numbers.reduce(lcm)).toBeLessThanOrEqual(60);
      if (numbers.length === 3) three++;
    }
    expect(three / rows.length).toBeGreaterThan(0.25);
    expect(three / rows.length).toBeLessThan(0.35);
  });

  it('keeps GGD pairs with p and q at least 2 and the limits per context', () => {
    const limits: Record<string, number> = { planken: 200, fruit: 100, tegels: 900 };
    for (const { kind, context, numbers } of questions.map(parts)) {
      if (kind !== 'ggd') continue;
      const [a, b] = numbers as [number, number];
      const g = gcd(a, b);
      expect(a).not.toBe(b);
      expect(a / g).toBeGreaterThanOrEqual(2);
      expect(b / g).toBeGreaterThanOrEqual(2);
      expect(g).toBeGreaterThanOrEqual(2);
      expect(b).toBeLessThanOrEqual(limits[context]!);
      if (context === 'tegels') {
        expect(a % 10).toBe(0);
        expect(b % 10).toBe(0);
        expect(a).toBeGreaterThanOrEqual(100);
        expect(g).toBeGreaterThanOrEqual(20);
      } else {
        expect(g).toBeLessThanOrEqual(30);
      }
    }
  });

  it('writes the spec prompts', () => {
    expect(lcmGcdPrompt('kgv', 'bus', [12, 18])).toBe(
      'Bus A vertrekt elke 12 minuten, bus B elke 18 minuten. Om 8:00 vertrekken ze samen. Na hoeveel minuten weer?',
    );
    expect(lcmGcdPrompt('kgv', 'lampen', [4, 6])).toBe(
      'Lamp A knippert elke 4 seconden, lamp B elke 6 seconden. Ze knipperen nu samen. Na hoeveel seconden weer?',
    );
    expect(lcmGcdPrompt('kgv', 'groepjes', [4, 6])).toBe(
      'Een klas kan in groepjes van 4 en in groepjes van 6, zonder dat er iemand overblijft. Hoeveel kinderen zijn er minstens?',
    );
    expect(lcmGcdPrompt('kgv', 'groepjes', [4, 6, 8])).toBe(
      'Een klas kan in groepjes van 4, 6 en 8, zonder dat er iemand overblijft. Hoeveel kinderen zijn er minstens?',
    );
    expect(lcmGcdPrompt('ggd', 'planken', [84, 126])).toBe(
      'Een plank van 84 cm en een van 126 cm zaag je in zo lang mogelijke gelijke stukken, zonder afval. Hoe lang is een stuk?',
    );
    expect(lcmGcdPrompt('ggd', 'fruit', [24, 36])).toBe(
      'Je hebt 24 appels en 36 peren en maakt zoveel mogelijk gelijke fruitschalen zonder over te houden. Hoeveel schalen?',
    );
    expect(lcmGcdPrompt('ggd', 'tegels', [360, 480])).toBe(
      'Een vloer van 360 cm bij 480 cm leg je vol met zo groot mogelijke vierkante tegels. Hoe lang is een zijde?',
    );
  });

  it('explains the concept, then the factorizations', () => {
    expect(lcmGcdExplanation('kgv', 'bus', [12, 18])).toBe(
      'Weer samen = KGV. 12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36',
    );
    expect(lcmGcdExplanation('ggd', 'planken', [84, 126])).toBe(
      'Zo lang mogelijk = GGD. 84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42',
    );
    expect(lcmGcdExplanation('kgv', 'groepjes', [2, 3, 4])).toBe(
      'Past in alle groepjes = KGV. 2 is priem, 3 is priem en 4 = 2² → KGV = 2² × 3 = 12',
    );
    for (const question of questions) {
      const { kind, context, numbers } = parts(question);
      expect(stepOf(question).check('0').explanation).toBe(
        lcmGcdExplanation(kind as 'kgv' | 'ggd', context as Context, numbers),
      );
    }
  });

  it('gives every key one ascending number list and repeats keys across orders', () => {
    for (const question of questions) {
      const { numbers } = parts(question);
      expect(numbers).toEqual([...numbers].sort((x, y) => x - y));
    }
  });
});
