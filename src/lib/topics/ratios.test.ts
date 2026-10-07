import { describe, expect, it } from 'vitest';
import { NO_BREAK_SPACE } from '../format';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import type { Question, Step } from '../types';
import { NICE_WHOLES } from './percentages';
import {
  divideExplanation,
  divideTip,
  generateRatios,
  MAX_RATIO_TERM,
  MAX_SCALED_ANSWER,
  MAX_SCALED_TERM,
  MAX_TOTAL,
  MIN_COUNT,
  MIN_PART,
  missingTermExplanation,
  missingTermTip,
  SCALING_CONTEXTS,
  scalingExplanation,
  scalingTip,
  type ScalingContext,
} from './ratios';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateRatios(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function context(id: string): ScalingContext {
  return SCALING_CONTEXTS.find((candidate) => candidate.id === id)!;
}

const questions = sample(31);
const missing = questions.filter((q) => formOf(q) === 'missing');
const scaling = questions.filter((q) => formOf(q) === 'scale');
const dividing = questions.filter((q) => formOf(q) === 'divide');

describe('generateRatios', () => {
  it('creates single-step integer questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('ratios');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      expect(expectedOf(question)).toMatch(/^\d+$/);
      const result = stepOf(question).check(expectedOf(question));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    expect(missing.length + scaling.length + dividing.length).toBe(SAMPLES);
    for (const form of [missing, scaling, dividing]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.28);
      expect(form.length / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('missing term', () => {
  function parts(question: Question) {
    const [a, b, c, d, position] = question.key.split(':').slice(2).map(Number) as [
      number,
      number,
      number,
      number,
      number,
    ];
    return { terms: [a, b, c, d] as const, position };
  }

  it('keeps the two ratios equal and within range', () => {
    for (const question of missing) {
      const { terms, position } = parts(question);
      const [a, b, c, d] = terms;
      expect(a * d).toBe(b * c);
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(Math.max(c, d)).toBeLessThanOrEqual(MAX_SCALED_TERM);
      expect(expectedOf(question)).toBe(String(terms[position]));
      const shown = terms.map((term, index) => (index === position ? '?' : String(term)));
      expect(stepOf(question).prompt).toBe(`${shown[0]} : ${shown[1]} = ${shown[2]} : ${shown[3]}`);
      expect(stepOf(question).check('').explanation).toBe(missingTermExplanation(terms, position));
    }
  });

  it('puts the unknown in each of the four positions about equally often', () => {
    for (const position of [0, 1, 2, 3]) {
      const share = missing.filter((q) => parts(q).position === position).length / missing.length;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.3);
    }
  });

  it('also uses left sides that are not simplified', () => {
    expect(missing.some((q) => gcd(parts(q).terms[0], parts(q).terms[1]) > 1)).toBe(true);
  });

  it.each([
    [[3, 5, 12, 20], 3, '3 : 5 = 12 : 20 (× 4)'],
    [[3, 5, 12, 20], 0, '12 : 20 = 3 : 5 (: 4)'],
    [[4, 6, 10, 15], 3, '4 : 6 = 2 : 3 = 10 : 15'],
    [[4, 6, 10, 15], 1, '10 : 15 = 2 : 3 = 4 : 6'],
  ] as const)('explains %j with the unknown at %i', (terms, position, expected) => {
    expect(missingTermExplanation(terms, position)).toBe(expected);
  });
});

describe('scaling', () => {
  function parts(question: Question) {
    const [, , id, a, amount, b] = question.key.split(':');
    return { context: context(id!), a: Number(a), amount: Number(amount), b: Number(b) };
  }

  it('scales a nice amount to a whole answer', () => {
    for (const question of scaling) {
      const { context, a, amount, b } = parts(question);
      expect(a).not.toBe(b);
      for (const count of [a, b]) {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(MAX_RATIO_TERM);
      }
      expect(NICE_WHOLES).toContain(amount);
      expect(amount).toBeLessThanOrEqual(context.maxAmount);
      expect((amount * gcd(a, b)) % a).toBe(0);
      const answer = (amount * b) / a;
      expect(answer).toBeLessThanOrEqual(MAX_SCALED_ANSWER);
      expect(expectedOf(question)).toBe(String(answer));
      const step = stepOf(question);
      expect(step.prompt).toBe(context.prompt(a, amount, b));
      expect(step.prefix).toBe(context.prefix);
      expect(step.suffix).toBe(context.suffix);
      expect(step.check('').explanation).toBe(scalingExplanation(a, amount, b));
    }
  });

  it('uses every context', () => {
    expect(new Set(scaling.map((q) => parts(q).context.id)).size).toBe(SCALING_CONTEXTS.length);
  });

  it('writes the contexts in Dutch', () => {
    expect(context('pasta').prompt(4, 300, 6)).toBe(
      'Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?',
    );
    expect(context('milk').prompt(4, 500, 6)).toBe(
      'Voor 4 personen: 500 ml melk. Hoeveel ml voor 6 personen?',
    );
    expect(context('notebooks').prompt(3, 12, 5)).toBe(
      `3 schriften kosten €${NO_BREAK_SPACE}12. Hoeveel kosten 5 schriften?`,
    );
    expect(context('notebooks').prefix).toBe('€');
  });

  it.each([
    [4, 300, 6, '4 → 300, 2 → 150, 6 → 450'],
    [4, 300, 8, '4 → 300, 8 → 600'],
    [8, 600, 4, '8 → 600, 4 → 300'],
    [3, 90, 5, '3 → 90, 1 → 30, 5 → 150'],
  ])('explains %i → %i, then %i with a ratio table', (a, amount, b, expected) => {
    expect(scalingExplanation(a, amount, b)).toBe(expected);
  });
});

describe('dividing in ratio', () => {
  function parts(question: Question) {
    const [, , total, a, b, size] = question.key.split(':');
    return { total: Number(total), a: Number(a), b: Number(b), largest: size === 'largest' };
  }

  it('divides the total in a simplified ratio', () => {
    for (const question of dividing) {
      const { total, a, b, largest } = parts(question);
      expect(a).not.toBe(b);
      expect(gcd(a, b)).toBe(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(total % (a + b)).toBe(0);
      expect(total / (a + b)).toBeGreaterThanOrEqual(2);
      expect(total).toBeLessThanOrEqual(MAX_TOTAL);
      const asked = largest ? Math.max(a, b) : Math.min(a, b);
      expect(expectedOf(question)).toBe(String((total / (a + b)) * asked));
      expect(stepOf(question).prompt).toBe(
        `Verdeel ${total} in de verhouding ${a} : ${b}. Hoe groot is het ${largest ? 'grootste' : 'kleinste'} deel?`,
      );
      expect(stepOf(question).check('').explanation).toBe(divideExplanation(total, a, b, asked));
    }
  });

  it('asks for the largest part about half of the time', () => {
    const share = dividing.filter((q) => parts(q).largest).length / dividing.length;
    expect(share).toBeGreaterThan(0.43);
    expect(share).toBeLessThan(0.57);
  });

  it.each([
    [60, 2, 3, 3, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36'],
    [60, 2, 3, 2, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 2 delen = 24'],
    [40, 1, 4, 1, '1 + 4 = 5 delen → 1 deel = 40 : 5 = 8'],
  ])('explains dividing %i in %i : %i', (total, a, b, asked, expected) => {
    expect(divideExplanation(total, a, b, asked)).toBe(expected);
  });
});

describe('every reachable case', () => {
  it('explains every missing-term exercise consistently', () => {
    let cases = 0;
    for (let p = 1; p <= MAX_RATIO_TERM; p++) {
      for (let q = 1; q <= MAX_RATIO_TERM; q++) {
        if (p === q || gcd(p, q) !== 1) continue;
        const largest = Math.max(p, q);
        for (let m = 1; m <= Math.floor(MAX_RATIO_TERM / largest); m++) {
          for (let n = 1; n <= Math.floor(MAX_SCALED_TERM / largest); n++) {
            if (n === m) continue;
            const terms = [p * m, q * m, p * n, q * n] as const;
            for (const position of [0, 1, 2, 3]) {
              cases++;
              const text = missingTermExplanation(terms, position);
              const pairs = [...text.matchAll(/(\d+) : (\d+)/g)].map(
                (match) => [Number(match[1]), Number(match[2])] as const,
              );
              const message = `${terms.join(':')} at ${position}: ${text}`;
              expect(pairs.length, message).toBeGreaterThanOrEqual(2);
              for (const [x, y] of pairs) expect(x * q, message).toBe(y * p);
              const first = pairs[0]!;
              const last = pairs[pairs.length - 1]!;
              const side = position < 2 ? [terms[0], terms[1]] : [terms[2], terms[3]];
              expect([...last], message).toEqual(side);
              const times = /\(× (\d+)\)$/.exec(text);
              if (times) {
                expect(last, message).toEqual([
                  first[0] * Number(times[1]),
                  first[1] * Number(times[1]),
                ]);
              }
              const divided = /\(: (\d+)\)$/.exec(text);
              if (divided) {
                expect(last[0] * Number(divided[1]), message).toBe(first[0]);
                expect(last[1] * Number(divided[1]), message).toBe(first[1]);
              }
            }
          }
        }
      }
    }
    expect(cases).toBeGreaterThan(1000);
  });

  it('explains every scaling exercise with a consistent ratio table', () => {
    for (let a = MIN_COUNT; a <= MAX_RATIO_TERM; a++) {
      for (let b = MIN_COUNT; b <= MAX_RATIO_TERM; b++) {
        if (a === b) continue;
        for (const { id, maxAmount } of SCALING_CONTEXTS) {
          const amounts = NICE_WHOLES.filter(
            (amount) =>
              amount <= maxAmount &&
              (amount * gcd(a, b)) % a === 0 &&
              (amount * b) / a <= MAX_SCALED_ANSWER,
          );
          expect(amounts.length, `${id} ${a} → ${b}`).toBeGreaterThan(0);
          for (const amount of amounts) {
            const text = scalingExplanation(a, amount, b);
            const message = `${id} ${a} ${amount} ${b}: ${text}`;
            const rows = text.split(', ').map((row) => {
              const match = /^(\d+) → (\d+)$/.exec(row);
              expect(match, message).not.toBeNull();
              return [Number(match![1]), Number(match![2])] as const;
            });
            for (const [count, value] of rows) expect(value * a, message).toBe(amount * count);
            expect([...rows[0]!], message).toEqual([a, amount]);
            expect([...rows[rows.length - 1]!], message).toEqual([b, (amount * b) / a]);
          }
        }
      }
    }
  });

  it('can always divide in a simplified ratio with at least the minimum part', () => {
    for (let a = 1; a <= MAX_RATIO_TERM; a++) {
      for (let b = 1; b <= MAX_RATIO_TERM; b++) {
        if (a === b || gcd(a, b) !== 1) continue;
        expect(Math.floor(MAX_TOTAL / (a + b)), `${a} : ${b}`).toBeGreaterThanOrEqual(MIN_PART);
      }
    }
  });
});

describe('ratio tips', () => {
  const additive =
    'Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal; het verschil blijft niet gelijk.';

  it.each([
    [0, -3],
    [1, 11],
    [2, 18],
    [3, 14],
  ])('names the additive answer for position %i', (position, given) => {
    expect(missingTermTip([3, 5, 12, 20], position)(fromInteger(given))).toBe(additive);
  });

  it('names inverse and additive scaling', () => {
    const up = scalingTip(4, 300, 6);
    expect(up(fromInteger(200))).toBe(
      'Je hebt omgekeerd geschaald: 6 is meer dan 4, dus het antwoord is meer dan 300.',
    );
    expect(up(fromInteger(302))).toBe(
      'Je hebt het verschil in aantal opgeteld; bij een verhouding vermenigvuldig je.',
    );
    expect(scalingTip(6, 450, 4)(fromInteger(675))).toBe(
      'Je hebt omgekeerd geschaald: 4 is minder dan 6, dus het antwoord is minder dan 450.',
    );
    expect(up(fromInteger(451))).toBeUndefined();
  });

  it('names the other part, one part, and dividing by one term', () => {
    const tip = divideTip(60, 2, 3, true);
    expect(tip(fromInteger(24))).toBe('Dat is het kleinste deel; gevraagd is het grootste.');
    expect(tip(fromInteger(12))).toBe('Dat is 1 deel; het grootste deel is 3 delen.');
    expect(tip(fromInteger(30))).toBe('Deel eerst door het totaal aantal delen: 2 + 3 = 5.');
    expect(tip(fromInteger(20))).toBe('Deel eerst door het totaal aantal delen: 2 + 3 = 5.');
    expect(tip(fromInteger(37))).toBeUndefined();
    expect(divideTip(60, 2, 3, false)(fromInteger(36))).toBe(
      'Dat is het grootste deel; gevraagd is het kleinste.',
    );
  });

  it('handles a ratio with a term of 1', () => {
    // 40 in 1 : 3: unit 10, largest part 30, smallest part 10.
    const tip = divideTip(40, 1, 3, true);
    expect(tip(fromInteger(10))).toBe('Dat is het kleinste deel; gevraagd is het grootste.');
    expect(tip(fromInteger(40))).toBe('Deel eerst door het totaal aantal delen: 1 + 3 = 4.');
    expect(divideTip(40, 1, 3, false)(fromInteger(30))).toBe(
      'Dat is het grootste deel; gevraagd is het kleinste.',
    );
  });

  it('wires the other-part tip into generated divide questions', () => {
    const rng = createRng(8);
    let seen = 0;
    for (let i = 0; i < 900; i++) {
      const step = generateRatios(rng).steps[0]!;
      const match =
        /^Verdeel (\d+) in de verhouding (\d+) : (\d+)\. Hoe groot is het (grootste|kleinste) deel\?$/.exec(
          step.prompt,
        );
      if (!match) continue;
      const [total, a, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
      const largest = match[4] === 'grootste';
      const unit = total / (a + b);
      const other = (largest ? Math.min(a, b) : Math.max(a, b)) * unit;
      seen++;
      expect(step.check(String(other)).tip).toBe(
        `Dat is het ${largest ? 'kleinste' : 'grootste'} deel; gevraagd is het ${match[4]}.`,
      );
    }
    expect(seen).toBeGreaterThan(100);
  });
});
