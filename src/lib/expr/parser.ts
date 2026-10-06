import { negate, type Rational } from '../rational';
import { tokenize, type Operator, type Token } from './tokenizer';

export type BinaryOperator = Exclude<Operator, '^'>;

/**
 * Expression AST (spec §7). Explicit parentheses are kept as group nodes, because the
 * associative check depends on them. A negative literal is a number node with a negative value:
 * `(−3)` is its notation, not a group.
 */
export type Expr =
  | { type: 'number'; value: Rational }
  | { type: 'binary'; operator: BinaryOperator; left: Expr; right: Expr }
  | { type: 'power'; base: Expr; exponent: Expr }
  | { type: 'group'; inner: Expr };

/**
 * Recursive descent over the grammar of spec §7, by increasing precedence:
 * `sum := product (('+'|'−') product)*`, `product := power (('×'|':') power)*`,
 * `power := unary ('^' atom)?`, `unary := '−' number | atom`, `atom := number | '(' sum ')'`.
 * Unary minus is only allowed at the start and directly after '('. Binary operators are
 * left-associative. Returns null for any syntax error.
 */
export function parse(input: string): Expr | null {
  const tokenized = tokenize(input);
  if (tokenized === null) return null;
  const tokens: readonly Token[] = tokenized;
  let position = 0;

  function operatorAt<O extends Operator>(...operators: O[]): O | null {
    const token = tokens[position];
    if (token?.type !== 'operator') return null;
    return operators.find((operator) => operator === token.operator) ?? null;
  }

  function atom(): Expr | null {
    const token = tokens[position];
    if (token?.type === 'number') {
      position++;
      return { type: 'number', value: token.value };
    }
    if (token?.type !== 'open') return null;
    position++;
    const inner = sum();
    if (inner === null || tokens[position]?.type !== 'close') return null;
    position++;
    // '(−3)' is how a negative literal is written (spec §5.8), not a group.
    return inner.type === 'number' && inner.value.num < 0n ? inner : { type: 'group', inner };
  }

  function unary(): Expr | null {
    const unaryAllowed = position === 0 || tokens[position - 1]?.type === 'open';
    if (!unaryAllowed || operatorAt('−') === null) return atom();
    position++;
    const token = tokens[position];
    if (token?.type !== 'number') return null;
    position++;
    return { type: 'number', value: negate(token.value) };
  }

  function power(): Expr | null {
    const base = unary();
    if (base === null || operatorAt('^') === null) return base;
    position++;
    const exponent = atom();
    return exponent === null ? null : { type: 'power', base, exponent };
  }

  function chain(operand: () => Expr | null, operators: readonly BinaryOperator[]): Expr | null {
    let left = operand();
    while (left !== null) {
      const operator = operatorAt(...operators);
      if (operator === null) break;
      position++;
      const right = operand();
      left = right === null ? null : { type: 'binary', operator, left, right };
    }
    return left;
  }

  function product(): Expr | null {
    return chain(power, ['×', ':']);
  }

  function sum(): Expr | null {
    return chain(product, ['+', '−']);
  }

  const expr = sum();
  return expr !== null && position === tokens.length ? expr : null;
}
