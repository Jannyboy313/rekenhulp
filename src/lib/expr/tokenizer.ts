import { SUPERSCRIPT_DIGITS } from '../format';
import { parseDutchNumber, rational, type Rational } from '../rational';

export type Operator = '+' | '−' | '×' | ':' | '^';

export type Token =
  | { type: 'number'; value: Rational }
  | { type: 'operator'; operator: Operator }
  | { type: 'open' }
  | { type: 'close' };

// Integers and Dutch decimals: '12', '3,5'.
const NUMBER = /^\d+(?:,\d+)?/;
// Superscript exponents as written in prompts: '5²' reads as '5^2' (spec §7).
const SUPERSCRIPT = /^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/;

const OPERATORS = new Map<string, Operator>([
  ['+', '+'],
  ['−', '−'],
  // The keypad types an ASCII hyphen for minus.
  ['-', '−'],
  ['×', '×'],
  [':', ':'],
  ['^', '^'],
]);

/** Splits input into the tokens of spec §7, skipping whitespace. Null for any other character. */
export function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let rest = input;
  while (rest !== '') {
    const number = NUMBER.exec(rest);
    if (number) {
      tokens.push({ type: 'number', value: parseDutchNumber(number[0])! });
      rest = rest.slice(number[0].length);
      continue;
    }
    const superscript = SUPERSCRIPT.exec(rest);
    if (superscript) {
      const digits = [...superscript[0]].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join('');
      tokens.push(
        { type: 'operator', operator: '^' },
        { type: 'number', value: rational(BigInt(digits)) },
      );
      rest = rest.slice(superscript[0].length);
      continue;
    }
    const char = rest[0]!;
    const operator = OPERATORS.get(char);
    if (operator) tokens.push({ type: 'operator', operator });
    else if (char === '(') tokens.push({ type: 'open' });
    else if (char === ')') tokens.push({ type: 'close' });
    else if (!/\s/.test(char)) return null;
    rest = rest.slice(1);
  }
  return tokens;
}
