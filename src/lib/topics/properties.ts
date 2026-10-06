import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { explainEvaluation } from '../expr/reduce';
import { PROPERTIES, type Property } from '../expr/rewriteCheck';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { numberStep, rewriteStep } from '../steps';
import type { Question } from '../types';

// Properties: commutative, associative and distributive (spec §5.11).

export type Variant = 'basis' | 'gevorderd';

/** A drawn template: the expression and an example rewrite per applicable property. */
export interface PropertyExercise {
  text: string;
  /** The useful property: Basis asks for this one. */
  intended: Property;
  rewrites: Partial<Record<Property, string>>;
}

/** The round numbers R of `a × n` with n = R ± d. */
export const ROUND_NUMBERS: readonly number[] = [
  20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

/** Factor pairs with a product of 100 or 1000, in either order. */
export const ROUND_PAIRS: readonly (readonly [number, number])[] = [
  [25, 4],
  [4, 25],
  [50, 2],
  [2, 50],
  [20, 5],
  [5, 20],
  [125, 8],
  [8, 125],
];

/** 'commutatief', as in "Geldige stap (commutatief)". */
const ADJECTIVES: Record<Property, string> = {
  commutative: 'commutatief',
  associative: 'associatief',
  distributive: 'distributief',
};

/** 'commutatieve', as in "Pas de commutatieve eigenschap toe". */
const ATTRIBUTIVES: Record<Property, string> = {
  commutative: 'commutatieve',
  associative: 'associatieve',
  distributive: 'distributieve',
};

const notRound = (value: number) => value % 10 !== 0;

/** a ∈ [3, 19] without 10 of the distributive templates, unequal to `other`. */
function factor(rng: Rng, other?: number): number {
  return randomIntWhere(rng, 3, 19, (value) => value !== 10 && value !== other);
}

/** Two numbers in [11, 89], not multiples of 10, that add up to 100. */
function hundredPair(rng: Rng): [number, number] {
  const first = randomIntWhere(rng, 11, 89, notRound);
  return [first, 100 - first];
}

/** The free term of a round-sum template, unequal to the operand it may be swapped with. */
function freeTerm(rng: Rng, other: number): number {
  return randomIntWhere(rng, 11, 99, (value) => notRound(value) && value !== other);
}

/**
 * The free factor of a round-product template, unequal to the operand it may be swapped with.
 * At least 11, so the property is worth using (`5 × 3 × 20` is not).
 */
function freeFactor(rng: Rng, other: number): number {
  return randomIntWhere(rng, 11, 49, (value) => notRound(value) && value !== other);
}

/** The seven templates of spec §5.11, each equally likely. */
export const PROPERTY_TEMPLATES: readonly ((rng: Rng) => PropertyExercise)[] = [
  // a × n with n close to round: 7 × 98
  (rng) => {
    const round = pick(rng, ROUND_NUMBERS);
    const offset = randomInt(rng, 1, 3) * (rng() < 0.5 ? -1 : 1);
    const n = round + offset;
    const a = factor(rng, n);
    const sign = offset < 0 ? '−' : '+';
    return {
      text: `${a} × ${n}`,
      intended: 'distributive',
      rewrites: {
        commutative: `${n} × ${a}`,
        distributive: `${a} × ${round} ${sign} ${a} × ${Math.abs(offset)}`,
      },
    };
  },
  // a × (b + c) with b round: 6 × (40 + 3)
  (rng) => {
    const a = factor(rng);
    const b = 10 * randomInt(rng, 2, 9);
    const c = randomInt(rng, 1, 9);
    return {
      text: `${a} × (${b} + ${c})`,
      intended: 'distributive',
      rewrites: {
        commutative: `(${b} + ${c}) × ${a}`,
        distributive: `${a} × ${b} + ${a} × ${c}`,
      },
    };
  },
  // a × b + a × c with b + c = 100: 7 × 13 + 7 × 87
  (rng) => {
    const a = factor(rng);
    const [b, c] = hundredPair(rng);
    return {
      text: `${a} × ${b} + ${a} × ${c}`,
      intended: 'distributive',
      rewrites: {
        commutative: `${a} × ${c} + ${a} × ${b}`,
        distributive: `${a} × (${b} + ${c})`,
      },
    };
  },
  // (a + b) + c with b + c = 100: (17 + 25) + 75
  (rng) => {
    const [b, c] = hundredPair(rng);
    const a = freeTerm(rng, b);
    return {
      text: `(${a} + ${b}) + ${c}`,
      intended: 'associative',
      rewrites: { commutative: `${c} + (${a} + ${b})`, associative: `${a} + (${b} + ${c})` },
    };
  },
  // (a × b) × c with b × c round: (13 × 25) × 4
  (rng) => {
    const [b, c] = pick(rng, ROUND_PAIRS);
    const a = freeFactor(rng, b);
    return {
      text: `(${a} × ${b}) × ${c}`,
      intended: 'associative',
      rewrites: { commutative: `${c} × (${a} × ${b})`, associative: `${a} × (${b} × ${c})` },
    };
  },
  // a + b + c with a + c = 100: 38 + 57 + 62
  (rng) => {
    const [a, c] = hundredPair(rng);
    const b = freeTerm(rng, c);
    return {
      text: `${a} + ${b} + ${c}`,
      intended: 'commutative',
      rewrites: { commutative: `${a} + ${c} + ${b}`, associative: `${a} + (${b} + ${c})` },
    };
  },
  // a × b × c with a × c round: 25 × 37 × 4
  (rng) => {
    const [a, c] = pick(rng, ROUND_PAIRS);
    const b = freeFactor(rng, c);
    return {
      text: `${a} × ${b} × ${c}`,
      intended: 'commutative',
      rewrites: { commutative: `${a} × ${c} × ${b}`, associative: `${a} × (${b} × ${c})` },
    };
  },
];

export function drawPropertyExercise(rng: Rng): PropertyExercise {
  return pick(rng, PROPERTY_TEMPLATES)(rng);
}

/** The properties that apply to an exercise, in the order of PROPERTIES. */
export function applicableProperties(exercise: PropertyExercise): Property[] {
  return PROPERTIES.filter((property) => exercise.rewrites[property] !== undefined);
}

/** Step 1 applies `property`, step 2 asks for the value (spec §5.11). */
export function propertyQuestion(
  exercise: PropertyExercise,
  variant: Variant,
  property: Property,
): Question {
  const { text, intended, rewrites } = exercise;
  const original = parse(text);
  const value = original === null ? null : evaluate(original);
  const example = rewrites[property];
  const useful = parse(rewrites[intended] ?? '');
  if (original === null || value === null || example === undefined || useful === null) {
    throw new RangeError(`Invalid property exercise: ${text}`);
  }
  return {
    // The expression alone: never twice in a session, not even as Basis and Gevorderd (§5.11).
    key: `properties:${text}`,
    topic: 'properties',
    steps: [
      rewriteStep({
        prompt:
          variant === 'basis'
            ? `Vereenvoudig in één stap: ${text}`
            : `Pas de ${ATTRIBUTIVES[property]} eigenschap toe: ${text}`,
        original,
        property,
        example,
        otherProperty: (detected) =>
          variant === 'basis'
            ? `Geldige stap (${ADJECTIVES[detected]}), maar niet handig. Probeer ${ADJECTIVES[property]}.`
            : `Geldige stap (${ADJECTIVES[detected]}), maar gevraagd is ${ADJECTIVES[property]}.`,
      }),
      numberStep({ prompt: `${text} = ?`, answer: value, explanation: explainEvaluation(useful) }),
    ],
  };
}

/** Basis asks the useful property, Gevorderd any applicable one; each half of the time. */
export function generateProperties(rng: Rng): Question {
  const exercise = drawPropertyExercise(rng);
  const variant: Variant = rng() < 0.5 ? 'basis' : 'gevorderd';
  const property =
    variant === 'basis' ? exercise.intended : pick(rng, applicableProperties(exercise));
  return propertyQuestion(exercise, variant, property);
}
