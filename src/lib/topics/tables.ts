import { formatInteger } from '../format';
import { pick, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

/** Tables 2 to 15 without 1 and 10 (spec §5.1). The exclusion applies to both factors. */
export const TABLE_FACTORS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];

type TableForm = 'product' | 'division' | 'missingFactor';
const FORMS: readonly TableForm[] = ['product', 'division', 'missingFactor'];

export function generateTables(rng: Rng): Question {
  const a = pick(rng, TABLE_FACTORS);
  const b = pick(rng, TABLE_FACTORS);
  const product = a * b;
  const [fa, fb, fp] = [formatInteger(a), formatInteger(b), formatInteger(product)];
  const fact = `${fa} × ${fb} = ${fp}`;

  switch (pick(rng, FORMS)) {
    case 'product':
      return tableQuestion(`product:${a}x${b}`, `${fa} × ${fb} = ?`, product);
    case 'division':
      return tableQuestion(`division:${product}:${b}`, `${fp} : ${fb} = ?`, a, fact);
    case 'missingFactor':
      return rng() < 0.5
        ? tableQuestion(`missingLeft:${b}:${product}`, `? × ${fb} = ${fp}`, a, fact)
        : tableQuestion(`missingRight:${a}:${product}`, `${fa} × ? = ${fp}`, b, fact);
  }
}

function tableQuestion(
  key: string,
  prompt: string,
  answer: number,
  explanation?: string,
): Question {
  return {
    key: `tables:${key}`,
    topic: 'tables',
    steps: [numberStep({ prompt, answer: fromInteger(answer), explanation })],
  };
}
