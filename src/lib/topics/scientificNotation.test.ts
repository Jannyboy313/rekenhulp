import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR, SUPERSCRIPT_DIGITS } from '../format';
import { createRng } from '../random';
import { compare, fromInteger, multiply, parseDutchNumber, powerOfTen } from '../rational';
import { isNormalised, parseScientific, scientificValue } from '../steps';
import type { Question, Step } from '../types';
import {
  buildScientificNotation,
  EXPONENTS,
  generateScientificNotation,
  NOTATION_FORMS,
  type NotationForm,
  normaliseQuestion,
  toNotationQuestion,
  toNumberQuestion,
} from './scientificNotation';

const PER_FORM = 1000;
const TO_NOTATION = /^Schrijf in wetenschappelijke notatie: ([\d,\u{202f}]+)$/u;
const NORMALISE =
  /^Schrijf in wetenschappelijke notatie: ([\d,\u{202f}]+) × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/u;
const TO_NUMBER = /^(?:([\d,]+) × )?10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \?$/u;

function questionsOf(form: NotationForm): Question[] {
  const rng = createRng(600 + NOTATION_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildScientificNotation(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

/** '⁻³' → −3 */
function fromSuperscript(text: string): number {
  const digits = [...text.replace('⁻', '')].map((char) => SUPERSCRIPT_DIGITS.indexOf(char));
  return (text.startsWith('⁻') ? -1 : 1) * Number(digits.join(''));
}

/** '4,5 × 10⁶' as typed on the scientific keypad: '4,5×10^6'. */
function typedScientific(expected: string): string {
  const [coefficient = '', power = ''] = expected.split(' × ');
  return `${coefficient}×10^${fromSuperscript(power.slice(2))}`;
}

function typedAnswer(step: Step): string {
  const { expected } = step.check('');
  return step.kind === 'scientific' ? typedScientific(expected) : plain(expected);
}

describe('generateScientificNotation', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const kinds = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateScientificNotation(rng);
      expect(question.topic).toBe('scientificNotation');
      const step = stepOf(question);
      expect(step.check(typedAnswer(step)).correct, step.prompt).toBe(true);
      kinds.add(question.key.split(':')[1]!);
    }
    expect([...kinds].sort()).toEqual(['from', 'normalise', 'to']);
  });
});

describe('to notation', () => {
  const questions = questionsOf('toNotation');

  it('writes out a number of at most 10 digits and expects its normalised notation', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('scientific');
      const written = plain(TO_NOTATION.exec(step.prompt)![1]!);
      expect(written.replace(',', '').length, written).toBeLessThanOrEqual(10);
      const answer = parseScientific(typedAnswer(step))!;
      expect(isNormalised(answer)).toBe(true);
      expect(EXPONENTS).toContain(answer.exponent);
      expect(scientificValue(answer)).toEqual(parseDutchNumber(written));
    }
  });

  it('explains via the power of ten written out', () => {
    const step = stepOf(toNotationQuestion(45, 6));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 4\u{202f}500\u{202f}000');
    expect(step.check('4,5×10^6')).toEqual({
      correct: true,
      expected: '4,5 × 10⁶',
      explanation: '4\u{202f}500\u{202f}000 = 4,5 × 1\u{202f}000\u{202f}000 = 4,5 × 10⁶',
    });
    expect(stepOf(toNotationQuestion(45, -5)).check('4,5×10^-5').explanation).toBe(
      '0,000045 = 4,5 × 0,00001 = 4,5 × 10⁻⁵',
    );
  });

  it('names counting the zeros, also for small numbers', () => {
    expect(stepOf(toNotationQuestion(45, 6)).check('4,5×10^5').tip).toBe(
      'Tel de plaatsen waarover de komma schuift, niet de nullen.',
    );
    const small = stepOf(toNotationQuestion(45, -5));
    expect(small.check('4,5×10^-4').tip).toBe(
      'Tel de plaatsen waarover de komma schuift, niet de nullen.',
    );
    expect(small.check('4,5×10^5').tip).toBe(
      'Een getal kleiner dan 1 heeft een negatieve exponent.',
    );
  });

  it('gives the zeros tip only when counting zeros gives a different exponent', () => {
    // 4 000 000 has 6 zeros and n = 6: 4 × 10⁵ is just off by a factor 10.
    expect(stepOf(toNotationQuestion(4, 6)).check('4×10^5').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });
});

describe('to number', () => {
  const questions = questionsOf('toNumber');

  it('writes c × 10ⁿ, or just 10ⁿ for c = 1, and expects the number', () => {
    let bare = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = TO_NUMBER.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const coefficient = match![1] === undefined ? fromInteger(1) : parseDutchNumber(match![1])!;
      if (match![1] === undefined) bare++;
      else expect(compare(coefficient, fromInteger(1))).toBe(1);
      const exponent = fromSuperscript(match![2]!);
      expect(EXPONENTS).toContain(exponent);
      expect(parseDutchNumber(typedAnswer(step))).toEqual(
        multiply(coefficient, powerOfTen(exponent)),
      );
    }
    expect(bare).toBeGreaterThan(0);
  });

  it('explains via the power of ten written out', () => {
    const step = stepOf(toNumberQuestion(45, -3));
    expect(step.prompt).toBe('4,5 × 10⁻³ = ?');
    expect(step.check('0,0045')).toMatchObject({
      correct: true,
      explanation: '4,5 × 10⁻³ = 4,5 × 0,001 = 0,0045',
    });
    const bare = stepOf(toNumberQuestion(1, 6));
    expect(bare.prompt).toBe('10⁶ = ?');
    expect(bare.check('1000000').explanation).toBe('10⁶ = 1\u{202f}000\u{202f}000');
  });
});

describe('normalise', () => {
  const questions = questionsOf('normalise');

  it('shows a coefficient outside [1, 10) and expects the normalised notation', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = NORMALISE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const shown = parseDutchNumber(plain(match![1]!))!;
      const k = fromSuperscript(match![2]!);
      expect(k).not.toBe(0);
      expect(isNormalised({ coefficient: shown, exponent: k })).toBe(false);
      const answer = parseScientific(typedAnswer(step))!;
      expect(isNormalised(answer)).toBe(true);
      expect(EXPONENTS).toContain(answer.exponent);
      expect(scientificValue(answer)).toEqual(multiply(shown, powerOfTen(k)));
    }
  });

  it('explains the shift and names moving the exponent the wrong way', () => {
    const step = stepOf(normaliseQuestion(45, 6, 2));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 450 × 10⁴');
    expect(step.check('4,5×10^6')).toMatchObject({
      correct: true,
      explanation: '450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶',
    });
    expect(step.check('4,5×10^2').tip).toBe(
      'Het getal vóór × 10 wordt 100 keer kleiner, dus de exponent wordt 2 groter.',
    );
    expect(step.check('450×10^4').tip).toBe(
      'De waarde klopt, maar het getal vóór × 10 moet minstens 1 en kleiner dan 10 zijn.',
    );
  });

  it('handles a coefficient below 1 and a negative exponent', () => {
    const step = stepOf(normaliseQuestion(3, -3, -1));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 0,3 × 10⁻²');
    expect(step.check('3×10^-3')).toMatchObject({
      correct: true,
      explanation: '0,3 × 10⁻² = 3 × 10⁻¹ × 10⁻² = 3 × 10⁻³',
    });
    expect(step.check('3×10^-1').tip).toBe(
      'Het getal vóór × 10 wordt 10 keer groter, dus de exponent wordt 1 kleiner.',
    );
  });
});
