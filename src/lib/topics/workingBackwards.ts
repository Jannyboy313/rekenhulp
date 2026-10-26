import { formatEuro, formatInteger as f, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Working backwards (spec §5.42).
export type OperationKind = 'times' | 'divide' | 'plus' | 'minus';
export interface Operation {
  kind: OperationKind;
  k: number;
}

const INVERSE: Readonly<Record<OperationKind, OperationKind>> = {
  times: 'divide',
  divide: 'times',
  plus: 'minus',
  minus: 'plus',
};

function apply({ kind, k }: Operation, value: number): number {
  switch (kind) {
    case 'times':
      return value * k;
    case 'divide':
      return value / k;
    case 'plus':
      return value + k;
    case 'minus':
      return value - k;
  }
}

/**
 * Applies the operations in order; null when a rule of §5.42 breaks (same kind in a row, an
 * undo, a division that is not exact, a value outside [1, 200]).
 */
export function applyChain(start: number, operations: readonly Operation[]): number | null {
  let value = start;
  let previous: Operation | undefined;
  for (const operation of operations) {
    if (previous) {
      if (previous.kind === operation.kind) return null;
      if (INVERSE[previous.kind] === operation.kind && previous.k === operation.k) return null;
    }
    value = apply(operation, value);
    if (!Number.isInteger(value) || value < 1 || value > 200) return null;
    previous = operation;
  }
  return value;
}

const FIRST_PHRASE: Readonly<Record<OperationKind, (k: number) => string>> = {
  times: (k) => `Ik doe het keer ${k}`,
  divide: (k) => `Ik deel het door ${k}`,
  plus: (k) => `Ik tel er ${k} bij op`,
  minus: (k) => `Ik trek er ${k} van af`,
};

const LATER_PHRASE: Readonly<Record<OperationKind, (k: number) => string>> = {
  times: (k) => `doe de uitkomst keer ${k}`,
  divide: (k) => `deel de uitkomst door ${k}`,
  plus: (k) => `tel er ${k} bij op`,
  minus: (k) => `trek er ${k} van af`,
};

const UNDO_SYMBOL: Readonly<Record<OperationKind, string>> = {
  times: ':',
  divide: '×',
  plus: MINUS,
  minus: '+',
};

/** 'a en b' or 'a, b en c'. */
function joinPhrases(phrases: readonly string[]): string {
  return `${phrases.slice(0, -1).join(', ')} en ${phrases.at(-1)}`;
}

export function thinkOfNumberQuestion(start: number, operations: readonly Operation[]): Question {
  const result = applyChain(start, operations)!;
  const phrases = operations.map(({ kind, k }, i) =>
    i === 0 ? FIRST_PHRASE[kind](k) : LATER_PHRASE[kind](k),
  );
  const undo: string[] = [];
  let value = result;
  for (const operation of [...operations].reverse()) {
    const before = apply({ kind: INVERSE[operation.kind], k: operation.k }, value);
    undo.push(`${f(value)} ${UNDO_SYMBOL[operation.kind]} ${operation.k} = ${f(before)}`);
    value = before;
  }
  return {
    key: `workingBackwards:number:${start}:${operations.map(({ kind, k }) => `${kind}${k}`).join(',')}`,
    topic: 'workingBackwards',
    steps: [
      numberStep({
        prompt: `Ik denk aan een getal. ${joinPhrases(phrases)}. Ik kom uit op ${f(result)}. Aan welk getal dacht ik?`,
        answer: fromInteger(start),
        explanation: `Terugrekenen vanaf ${f(result)}: ${undo.join(' → ')}`,
      }),
    ],
  };
}

export type Part = 'helft' | 'derde' | 'kwart';
export const PART_ITEMS: readonly string[] = ['kleren', 'een cadeau', 'een spelletje'];
export const AMOUNT_ITEMS: readonly string[] = [
  'een lunch',
  'een boek',
  'een bioscoopkaartje',
  'een tijdschrift',
];

export interface Expenses {
  part: Part;
  partItem: string;
  amount: number;
  amountItem: string;
  partFirst: boolean;
}

/** The part spent is 1/n of the money. */
const PARTS: Readonly<Record<Part, { n: number; text: string; rest: string }>> = {
  helft: { n: 2, text: 'de helft', rest: 'de helft' },
  derde: { n: 3, text: 'een derde', rest: '2/3' },
  kwart: { n: 4, text: 'een kwart', rest: '3/4' },
};

/** The money after spending 1/n of `value`, or null when that is not whole. */
function afterPart(value: number, part: Part): number | null {
  const { n } = PARTS[part];
  return value % n === 0 ? value - value / n : null;
}

/** The rest after both expenses, or null when an amount is not whole or the rest is below 1. */
export function moneyRest(start: number, { part, amount, partFirst }: Expenses): number | null {
  let rest: number | null;
  if (partFirst) {
    const after = afterPart(start, part);
    rest = after === null ? null : after - amount;
  } else {
    rest = afterPart(start - amount, part);
  }
  return rest !== null && rest >= 1 ? rest : null;
}

const euro = (value: number) => formatEuro(fromInteger(value));

export function moneyQuestion(start: number, expenses: Expenses): Question {
  const { part, partItem, amount, amountItem, partFirst } = expenses;
  const rest = moneyRest(start, expenses)!;
  const { n, text, rest: restText } = PARTS[part];
  const undoPart = (after: number, over: boolean) => {
    const before = (after / (n - 1)) * n;
    const by = n === 2 ? `${f(after)} × 2` : `${f(after)} : ${n - 1} × ${n}`;
    return `${euro(after)} is ${restText} van wat je ${over ? 'over ' : ''}had → ${by} = ${f(before)}`;
  };
  const undoAmount = (after: number) => `${f(after)} + ${amount} = ${f(after + amount)}`;
  const prompt = partFirst
    ? `Je geeft ${text} van je geld uit aan ${partItem}. Daarna geef je ${euro(amount)} uit aan ${amountItem}.`
    : `Je geeft ${euro(amount)} uit aan ${amountItem}. Daarna geef je ${text} van wat je over hebt uit aan ${partItem}.`;
  const undo = partFirst
    ? [undoAmount(rest), undoPart(rest + amount, false)]
    : [undoPart(rest, true), undoAmount((rest / (n - 1)) * n)];
  return {
    key: `workingBackwards:money:${start}:${part}:${amount}:${partFirst}`,
    topic: 'workingBackwards',
    steps: [
      numberStep({
        prompt: `${prompt} Je hebt nog ${euro(rest)} over. Hoeveel geld had je eerst?`,
        answer: fromInteger(start),
        prefix: '€',
        explanation: `Terugrekenen vanaf ${euro(rest)}: ${undo.join(' → ')}`,
      }),
    ],
  };
}

const KINDS: readonly OperationKind[] = ['times', 'divide', 'plus', 'minus'];

// The shares of the spec (operation count, part, order) are drawn before the redraw loop, so
// rejected draws do not skew them.
function drawThinkOfNumber(rng: Rng): Question {
  const count = rng() < 0.5 ? 2 : 3;
  const { start, operations } = drawUntil(() => {
    const start = randomInt(rng, 2, 20);
    const operations = Array.from({ length: count }, (): Operation => {
      const kind = pick(rng, KINDS);
      const small = kind === 'times' || kind === 'divide';
      return { kind, k: small ? randomInt(rng, 2, 5) : randomInt(rng, 1, 20) };
    });
    return applyChain(start, operations) === null ? null : { start, operations };
  });
  return thinkOfNumberQuestion(start, operations);
}

function drawPart(rng: Rng): Part {
  const r = rng();
  return r < 0.5 ? 'helft' : r < 0.75 ? 'derde' : 'kwart';
}

function drawMoney(rng: Rng): Question {
  const part = drawPart(rng);
  const partFirst = rng() < 0.5;
  const { start, expenses } = drawUntil(() => {
    const start = randomInt(rng, 12, 80);
    const expenses: Expenses = {
      part,
      partItem: pick(rng, PART_ITEMS),
      amount: randomInt(rng, 3, 15),
      amountItem: pick(rng, AMOUNT_ITEMS),
      partFirst,
    };
    return moneyRest(start, expenses) === null ? null : { start, expenses };
  });
  return moneyQuestion(start, expenses);
}

/** Think of a number and money left over, each 1/2. */
export function generateWorkingBackwards(rng: Rng): Question {
  return rng() < 0.5 ? drawThinkOfNumber(rng) : drawMoney(rng);
}
