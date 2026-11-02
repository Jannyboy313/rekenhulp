import { formatInteger } from '../format';
import { drawUntil, pick, type Rng } from '../random';
import { SLOT } from '../slot';
import { equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import { positiveInteger, powerOfTenShift, type Diagnose } from '../tips';
import type { Question } from '../types';

/** Tables 2 to 15 without 1 and 10 (spec §5.1). The exclusion applies to both factors. */
export const TABLE_FACTORS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];

type TableForm = 'product' | 'division' | 'missingFactor';
/** `product` is listed twice: half of the exercises, the other two forms a quarter each (spec §5.1). */
const FORMS: readonly TableForm[] = ['product', 'product', 'division', 'missingFactor'];

/** A neighbouring row of the table: '63 = 7 × 9: je zit één rij ernaast.' (spec §3.4.1) */
export function neighbourRowTip(a: number, b: number): Diagnose {
  const neighbours: readonly (readonly [number, number])[] = [
    [a, b - 1],
    [a, b + 1],
    [a - 1, b],
    [a + 1, b],
  ];
  return (given) => {
    const hit = neighbours.find(([x, y]) => equals(given, fromInteger(x * y)));
    if (!hit) return undefined;
    const [x, y] = hit;
    return `${formatInteger(x * y)} = ${formatInteger(x)} × ${formatInteger(y)}: je zit één rij ernaast.`;
  };
}

/**
 * Division or missing factor: the product the answer gives, e.g. '9 × 7 = 63, niet 56.' An answer
 * 10ᵏ times the correct one is left to the factor-of-ten fallback (spec §3.4.1).
 */
export function productCheckTip(
  known: number,
  product: number,
  answer: number,
  unknownFirst: boolean,
): Diagnose {
  const correct = fromInteger(answer);
  return (given) => {
    const value = positiveInteger(given);
    if (value === null || powerOfTenShift(given, correct) !== null) return undefined;
    const [x, y] = unknownFirst ? [value, known] : [known, value];
    return `${formatInteger(x)} × ${formatInteger(y)} = ${formatInteger(x * y)}, niet ${formatInteger(product)}.`;
  };
}

/**
 * At least one factor is a chosen table (spec §5.1). Redrawing the pair keeps every allowed pair
 * equally likely; with all tables chosen the first draw is always accepted.
 */
export function generateTables(rng: Rng, chosen: readonly number[] = TABLE_FACTORS): Question {
  if (!chosen.some((table) => TABLE_FACTORS.includes(table))) {
    throw new RangeError('Choose at least one table');
  }
  const [a, b] = drawUntil((): [number, number] | null => {
    const pair: [number, number] = [pick(rng, TABLE_FACTORS), pick(rng, TABLE_FACTORS)];
    return pair.some((factor) => chosen.includes(factor)) ? pair : null;
  });
  const product = a * b;
  const [fa, fb, fp] = [formatInteger(a), formatInteger(b), formatInteger(product)];
  const fact = `${fa} × ${fb} = ${fp}`;
  const valid = chosen.filter((table) => TABLE_FACTORS.includes(table));
  const single = valid.length === 1 ? valid[0] : undefined;
  /** [unknown, known]; a single chosen table is always the known factor, else it is the answer. */
  const orient = (unknown: number, known: number): [number, number] =>
    unknown === single ? [known, unknown] : [unknown, known];

  switch (pick(rng, FORMS)) {
    case 'product':
      return tableQuestion(
        `product:${a}x${b}`,
        `${fa} × ${fb} = ${SLOT}`,
        product,
        neighbourRowTip(a, b),
      );
    case 'division': {
      const [answer, known] = orient(a, b);
      return tableQuestion(
        `division:${product}:${known}`,
        `${fp} : ${formatInteger(known)} = ${SLOT}`,
        answer,
        productCheckTip(known, product, answer, true),
        fact,
      );
    }
    case 'missingFactor': {
      if (rng() < 0.5) {
        const [answer, known] = orient(a, b);
        return tableQuestion(
          `missingLeft:${known}:${product}`,
          `${SLOT} × ${formatInteger(known)} = ${fp}`,
          answer,
          productCheckTip(known, product, answer, true),
          fact,
        );
      }
      const [answer, known] = orient(b, a);
      return tableQuestion(
        `missingRight:${known}:${product}`,
        `${formatInteger(known)} × ${SLOT} = ${fp}`,
        answer,
        productCheckTip(known, product, answer, false),
        fact,
      );
    }
  }
}

function tableQuestion(
  key: string,
  prompt: string,
  answer: number,
  diagnose: Diagnose,
  explanation?: string,
): Question {
  return {
    key: `tables:${key}`,
    topic: 'tables',
    steps: [numberStep({ prompt, answer: fromInteger(answer), explanation, diagnose })],
  };
}
