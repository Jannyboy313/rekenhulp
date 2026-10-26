import { formatInteger as f, MINUS } from '../format';
import { drawUntil, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Equations (spec §5.37): balancing, one step at a time.

/** `x` or `3x`: a coefficient of 1 is left out. */
function term(coefficient: number): string {
  return coefficient === 1 ? 'x' : `${f(coefficient)}x`;
}

/** `+ 5` or `− 5` for a signed constant. */
function signed(constant: number): string {
  return `${constant < 0 ? MINUS : '+'} ${Math.abs(constant)}`;
}

/** What balancing does with the constant `b`: `− 5` for a `+ 5`, `+ 5` for a `− 5`. */
function undo(b: number): string {
  return `${b < 0 ? '+' : MINUS} ${Math.abs(b)}`;
}

/**
 * The mistake: the constant `b` moved with the wrong sign, `right + b` instead of `right − b`,
 * divided by `divisor`. Only a whole solution is a tip.
 */
function movedTip(label: string, divisor: number, right: number, b: number): Diagnose {
  const wrong = right + b;
  if (wrong % divisor !== 0) return () => undefined;
  const action =
    b < 0 ? `Tel ${Math.abs(b)} aan beide kanten op` : `Haal ${b} aan beide kanten weg`;
  return exactTip(fromInteger(wrong / divisor), `${action}: ${label} = ${f(right)} ${undo(b)}.`);
}

function equationQuestion(
  equation: string,
  solution: number,
  explanation: string,
  diagnose: Diagnose,
): Question {
  return {
    key: `equations:${equation}`,
    topic: 'equations',
    steps: [
      numberStep({
        prompt: `Los op: ${equation}`,
        prefix: 'x =',
        answer: fromInteger(solution),
        explanation,
        diagnose,
      }),
    ],
  };
}

/** ax ± b = c, with a signed `b`; c follows from the solution x. */
export function linearQuestion(a: number, b: number, x: number): Question {
  const right = a * x + b;
  const equation = `${term(a)} ${signed(b)} = ${f(right)}`;
  const unknown = a * x;
  return equationQuestion(
    equation,
    x,
    `${equation} → ${term(a)} = ${f(right)} ${undo(b)} = ${f(unknown)} → x = ${f(unknown)} : ${a} = ${f(x)}`,
    movedTip(term(a), a, right, b),
  );
}

/** a(x ± b) = c. */
export function bracketQuestion(a: number, b: number, x: number): Question {
  const right = a * (x + b);
  const inside = x + b;
  const equation = `${a}(x ${signed(b)}) = ${f(right)}`;
  return equationQuestion(
    equation,
    x,
    `${equation} → x ${signed(b)} = ${f(right)} : ${a} = ${f(inside)} → x = ${f(inside)} ${undo(b)} = ${f(x)}`,
    movedTip('x', 1, inside, b),
  );
}

/** ax ± b = cx ± d, with `c` the coefficient on the right (1 is written `x`); d follows from x. */
export function bothSidesQuestion(a: number, b: number, c: number, x: number): Question {
  const d = (a - c) * x + b;
  const coefficient = a - c;
  const equation = `${term(a)} ${signed(b)} = ${term(c)} ${signed(d)}`;
  const reduced = `${term(coefficient)} ${signed(b)} = ${f(d)}`;
  const unknown = coefficient * x;
  const solve =
    coefficient === 1
      ? `x = ${f(d)} ${undo(b)} = ${f(x)}`
      : `${term(coefficient)} = ${f(d)} ${undo(b)} = ${f(unknown)} → x = ${f(unknown)} : ${coefficient} = ${f(x)}`;
  return equationQuestion(
    equation,
    x,
    `${equation} → ${reduced} → ${solve}`,
    movedTip(term(coefficient), coefficient, d, b),
  );
}

/** The right side of the first two forms: not 0, at most 100 in absolute value. */
function fitsRight(right: number): boolean {
  return right !== 0 && Math.abs(right) <= 100;
}

/**
 * The three forms, each 1/3. The signs of the solution (negative 25%) and of the constant (each
 * 1/2) are drawn first, so redrawing a misfit does not skew them.
 */
export function generateEquations(rng: Rng): Question {
  const form = rng();
  const negativeX = rng() < 0.25;
  const negativeB = rng() < 0.5;
  const solution = () => (negativeX ? -randomInt(rng, 1, 10) : randomInt(rng, 1, 20));
  const constant = () => (negativeB ? -1 : 1) * randomInt(rng, 1, 20);
  if (form < 1 / 3) {
    const { a, b, x } = drawUntil(() => {
      const a = randomInt(rng, 2, 9);
      const b = constant();
      const x = solution();
      return fitsRight(a * x + b) ? { a, b, x } : null;
    });
    return linearQuestion(a, b, x);
  }
  if (form < 2 / 3) {
    const { a, b, x } = drawUntil(() => {
      const a = randomInt(rng, 2, 9);
      const b = constant();
      const x = solution();
      return fitsRight(a * (x + b)) ? { a, b, x } : null;
    });
    return bracketQuestion(a, b, x);
  }
  const { a, b, c, x } = drawUntil(() => {
    const a = randomInt(rng, 3, 9);
    const c = randomInt(rng, 1, a - 1);
    const b = constant();
    const x = solution();
    const d = (a - c) * x + b;
    return d !== 0 && Math.abs(d) <= 50 ? { a, b, c, x } : null;
  });
  return bothSidesQuestion(a, b, c, x);
}
