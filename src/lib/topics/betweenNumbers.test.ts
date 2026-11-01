import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  parseFraction,
  rational,
  subtract,
  type Rational,
} from '../rational';
import {
  buildBetweenNumbers,
  FORMS,
  generateBetweenNumbers,
  jumpsQuestion,
  marksQuestion,
  MARK_PIECES,
  MAX_MIDDLE_DENOMINATOR,
  MIN_GAP,
  middleQuestion,
  type Form,
} from './betweenNumbers';
import { decimalShown, fractionShown } from './fractionNotation';
import { decimal, stepOf } from './testHelpers';

const PER_FORM = 1500;
const frac = (p: number, q: number) => rational(BigInt(p), BigInt(q));

function questionsOf(form: Form) {
  const rng = createRng(790 + FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildBetweenNumbers(rng, form));
}

/** A number as written in a prompt: a decimal, a fraction or a mixed number. */
function parse(text: string): Rational {
  return (text.includes('/') ? parseFraction(text)?.value : parseDutchNumber(text))!;
}

const kindOf = (text: string) => (text.includes('/') ? 'fraction' : 'decimal');

describe('spec examples', () => {
  it('middle of 1/4 and 1/3 is 7/24', () => {
    const step = stepOf(middleQuestion(fractionShown(1, 4), fractionShown(1, 3)));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Welk getal ligt precies midden tussen 1/4 en 1/3?');
    expect(step.check('7/24')).toMatchObject({
      correct: true,
      expected: '7/24',
      explanation: '1/4 = 6/24 en 1/3 = 8/24 → midden 7/24',
    });
    expect(step.check('14/48').correct).toBe(true);
    expect(step.check('1/3').correct).toBe(false);
  });

  it('middle of 2,7 and 3,05 is 2,875, shown in ascending order', () => {
    const step = stepOf(
      middleQuestion(decimalShown(decimal('3,05')), decimalShown(decimal('2,7'))),
    );
    expect(step.prompt).toBe('Welk getal ligt precies midden tussen 2,7 en 3,05?');
    expect(step.check('2,875')).toMatchObject({
      correct: true,
      expected: '2,875',
      explanation: '(2,7 + 3,05) : 2 = 5,75 : 2 = 2,875',
    });
  });

  it('middle of 0,6 and 3/4 is 0,675, also 27/40', () => {
    const step = stepOf(middleQuestion(decimalShown(decimal('0,6')), fractionShown(3, 4)));
    expect(step.prompt).toBe('Welk getal ligt precies midden tussen 0,6 en 3/4?');
    expect(step.check('0,675')).toMatchObject({
      correct: true,
      expected: '0,675',
      explanation: '3/4 = 0,75 → (0,6 + 0,75) : 2 = 1,35 : 2 = 0,675',
    });
    expect(step.check('27/40').correct).toBe(true);
  });

  it('explains a mixed pair with fractions when the middle has no finite decimal', () => {
    const step = stepOf(middleQuestion(fractionShown(1, 3), decimalShown(decimal('0,6'))));
    expect(step.check('7/15')).toMatchObject({
      correct: true,
      expected: '7/15',
      explanation: '0,6 = 3/5 → 1/3 = 10/30 en 3/5 = 18/30 → midden 7/15',
    });
  });

  it('shows a decimal expected answer next to the fraction when the pair is fractions', () => {
    const step = stepOf(middleQuestion(fractionShown(1, 2), fractionShown(3, 4)));
    expect(step.check('').expected).toBe('0,625');
    expect(step.check('5/8').correct).toBe(true);
    expect(step.check('').explanation).toBe('1/2 = 4/8 en 3/4 = 6/8 → midden 5/8 = 0,625');
  });

  it('jumps from 1,2 to 3 by 0,15 is 12 jumps', () => {
    const step = stepOf(jumpsQuestion(decimal('1,2'), decimal('0,15'), 12, false));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(
      'Je springt op de getallenlijn van 1,2 naar 3 in sprongen van 0,15. Hoeveel sprongen zijn dat?',
    );
    expect(step.check('12')).toMatchObject({
      correct: true,
      explanation: '3 − 1,2 = 1,8 → 1,8 : 0,15 = 180 : 15 = 12',
    });
  });

  it('jumps by a fraction from a half start, and from 0', () => {
    const step = stepOf(jumpsQuestion(add(fromInteger(2), frac(1, 2)), frac(1, 4), 14, true));
    expect(step.prompt).toBe(
      'Je springt op de getallenlijn van 2 1/2 naar 6 in sprongen van 1/4. Hoeveel sprongen zijn dat?',
    );
    expect(step.check('14')).toMatchObject({
      correct: true,
      explanation: '6 − 2 1/2 = 3 1/2 → 3 1/2 : 1/4 = 3 1/2 × 4 = 14',
    });
    const fromZero = stepOf(jumpsQuestion(fromInteger(0), frac(1, 8), 4, true));
    expect(fromZero.prompt).toContain('van 0 naar 1/2 in sprongen van 1/8.');
    expect(fromZero.check('4').explanation).toBe('1/2 : 1/8 = 1/2 × 8 = 4');
  });

  it('marks: the 5th mark of 8 pieces after 2 is 2,625, also 2 5/8', () => {
    const step = stepOf(marksQuestion(2, 8, 5));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe(
      'De getallenlijn van 2 tot 3 is in 8 gelijke stukjes verdeeld. Welk getal staat bij het 5e streepje na 2?',
    );
    expect(step.check('2,625')).toMatchObject({
      correct: true,
      expected: '2,625',
      explanation: '1 stukje = 1/8 → 2 + 5/8 = 2 5/8 = 2,625',
    });
    expect(step.check('2 5/8').correct).toBe(true);
    expect(step.check('21/8').correct).toBe(true);
    expect(step.check('2,5').correct).toBe(false);
  });

  it('marks: a mark that is not in lowest terms and a start of 0', () => {
    const step = stepOf(marksQuestion(0, 8, 2));
    expect(step.check('0,25').explanation).toBe('1 stukje = 1/8 → 0 + 2/8 = 2/8 = 1/4 = 0,25');
  });
});

describe('generateBetweenNumbers', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(4);
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateBetweenNumbers(rng);
      expect(question.topic).toBe('betweenNumbers');
      seen.add(question.key.split(':')[1]!);
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
    expect([...seen].sort()).toEqual([...FORMS].sort());
  });

  describe('middle', () => {
    const questions = questionsOf('middle');

    it('has the three variants with the numbers of the spec, in ascending order', () => {
      const variants = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^Welk getal ligt precies midden tussen (.+) en (.+)\?$/.exec(step.prompt)!;
        const [a, b] = [match[1]!, match[2]!];
        const [x, y] = [parse(a), parse(b)];
        expect(compare(x, y), step.prompt).toBeLessThan(0);
        expect(compare(subtract(y, x), MIN_GAP)).toBeGreaterThanOrEqual(0);
        if (kindOf(a) === 'decimal' && kindOf(b) === 'decimal') {
          expect(compare(subtract(y, x), decimal('1'))).toBeLessThanOrEqual(0);
        }
        variants.add([kindOf(a), kindOf(b)].sort().join('+'));
        for (const text of [a, b]) {
          if (kindOf(text) === 'fraction') {
            const [p, q] = text.split('/').map(Number) as [number, number];
            expect(q).toBeGreaterThanOrEqual(2);
            expect(q).toBeLessThanOrEqual(12);
            expect(p).toBeLessThan(q);
            expect(gcd(p, q)).toBe(1);
          } else {
            const decimals = text.split(',')[1]?.length ?? 0;
            expect(decimals).toBeGreaterThanOrEqual(1);
            expect(decimals).toBeLessThanOrEqual(2);
            expect(text.endsWith('0')).toBe(false);
            expect(compare(parse(text), fromInteger(20))).toBeLessThanOrEqual(0);
          }
        }
        const middle = multiply(add(x, y), rational(1n, 2n));
        const { expected } = step.check('');
        expect(compare(parse(expected), middle)).toBe(0);
        const terminating = decimalPlaces(middle);
        expect(
          terminating !== null || middle.den <= BigInt(MAX_MIDDLE_DENOMINATOR),
          step.prompt,
        ).toBe(true);
        expect(expected.includes('/')).toBe(terminating === null || terminating > 3);
        if (kindOf(a) === 'fraction' && kindOf(b) === 'decimal') {
          // A mixed pair stays below 1.
          expect(compare(y, fromInteger(1))).toBeLessThan(0);
        }
      }
      expect([...variants].sort()).toEqual([
        'decimal+decimal',
        'decimal+fraction',
        'fraction+fraction',
      ]);
    });
  });

  describe('jumps', () => {
    const questions = questionsOf('jumps');

    it('counts 4 to 30 jumps of a decimal from a 1-decimal start, or 30% of a fraction', () => {
      let fractionJumps = 0;
      const jumps = new Set<string>();
      const denominators = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        expect(step.kind).toBe('number');
        const match =
          /^Je springt op de getallenlijn van (.+) naar (.+) in sprongen van (\S+)\. Hoeveel sprongen zijn dat\?$/.exec(
            step.prompt,
          )!;
        const [start, end, jump] = [parse(match[1]!), parse(match[2]!), parse(match[3]!)];
        const count = divide(subtract(end, start), jump);
        expect(count.den).toBe(1n);
        expect(count.num).toBeGreaterThanOrEqual(4n);
        expect(count.num).toBeLessThanOrEqual(30n);
        expect(step.check(String(count.num)).correct).toBe(true);
        if (match[3]!.includes('/')) {
          fractionJumps++;
          const q = Number(match[3]!.split('/')[1]);
          denominators.add(q);
          expect(match[3]!.startsWith('1/')).toBe(true);
          expect([2, 3, 4, 5, 8]).toContain(q);
          // A whole or a half start.
          expect(multiply(start, fromInteger(2)).den).toBe(1n);
          expect(compare(start, fromInteger(10))).toBeLessThanOrEqual(0);
        } else {
          jumps.add(match[3]!);
          expect(decimalPlaces(start)).toBe(1);
          expect(compare(start, fromInteger(10))).toBeLessThanOrEqual(0);
          expect(compare(start, fromInteger(0))).toBeGreaterThan(0);
        }
      }
      expect(fractionJumps / PER_FORM).toBeGreaterThan(0.25);
      expect(fractionJumps / PER_FORM).toBeLessThan(0.35);
      expect([...jumps].sort()).toEqual(
        ['0,05', '0,1', '0,15', '0,2', '0,25', '0,3', '0,4', '0,5', '0,75'].sort(),
      );
      expect([...denominators].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 8]);
    });
  });

  describe('marks', () => {
    const questions = questionsOf('marks');

    it('marks k of n pieces from a whole in 0 to 9, never the half, with a decimal expected answer', () => {
      const wholes = new Set<number>();
      const pieces = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        const match =
          /^De getallenlijn van (\d+) tot (\d+) is in (\d+) gelijke stukjes verdeeld\. Welk getal staat bij het (\d+)e streepje na (\d+)\?$/.exec(
            step.prompt,
          )!;
        const [from, to, n, k, after] = match.slice(1).map(Number) as [
          number,
          number,
          number,
          number,
          number,
        ];
        expect(to).toBe(from + 1);
        expect(after).toBe(from);
        wholes.add(from);
        pieces.add(n);
        expect(MARK_PIECES).toContain(n);
        expect(k).toBeGreaterThanOrEqual(1);
        expect(k).toBeLessThanOrEqual(n - 1);
        expect(2 * k).not.toBe(n);
        const answer = add(fromInteger(from), frac(k, n));
        const { expected } = step.check('');
        expect(compare(parse(expected), answer)).toBe(0);
        expect(expected.includes(',') || Number(frac(k, n).den) === 1).toBe(true);
        expect(decimalPlaces(parse(expected))!).toBeLessThanOrEqual(3);
        const mixed = from === 0 ? `${k}/${n}` : `${from} ${k}/${n}`;
        expect(step.check(mixed).correct).toBe(true);
      }
      expect([...wholes].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect([...pieces].sort((a, b) => a - b)).toEqual([4, 5, 8, 10, 20]);
    });
  });
});
