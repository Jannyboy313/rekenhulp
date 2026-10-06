import type { Rational } from '../rational';
import { tokenize, type Operator, type Token } from './tokenizer';

/**
 * Expression AST (spec §7). Getallen & delers only needs products of powers of numbers;
 * Bewerkingen adds +, −, :, groups and unary minus.
 */
export type Expr =
  | { type: 'number'; value: Rational }
  | { type: 'binary'; operator: '×'; left: Expr; right: Expr }
  | { type: 'power'; base: Expr; exponent: Expr };

/**
 * Recursive descent over `product := power ('×' power)*`, `power := atom ('^' atom)?` and
 * `atom := number`. Returns null for any syntax error.
 */
export function parse(input: string): Expr | null {
  const tokenized = tokenize(input);
  if (tokenized === null) return null;
  const tokens: readonly Token[] = tokenized;
  let position = 0;

  function isOperator(operator: Operator): boolean {
    const token = tokens[position];
    return token?.type === 'operator' && token.operator === operator;
  }

  function atom(): Expr | null {
    const token = tokens[position];
    if (token?.type !== 'number') return null;
    position++;
    return { type: 'number', value: token.value };
  }

  function power(): Expr | null {
    const base = atom();
    if (base === null || !isOperator('^')) return base;
    position++;
    const exponent = atom();
    return exponent === null ? null : { type: 'power', base, exponent };
  }

  function product(): Expr | null {
    let left = power();
    while (left !== null && isOperator('×')) {
      position++;
      const right = power();
      left = right === null ? null : { type: 'binary', operator: '×', left, right };
    }
    return left;
  }

  const expr = product();
  return expr !== null && position === tokens.length ? expr : null;
}
