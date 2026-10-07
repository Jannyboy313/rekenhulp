import { describe, expect, it } from 'vitest';
import { parse } from './expr/parser';
import { fromInteger, rational } from './rational';
import {
  booleanStep,
  factorizationStep,
  fractionStep,
  isNormalised,
  NO,
  numberStep,
  parseAnswer,
  parseFactorization,
  parseScientific,
  rewriteStep,
  scientificValue,
  YES,
} from './steps';

describe('numberStep', () => {
  const step = numberStep({
    prompt: '3 × 4 = ?',
    answer: fromInteger(12),
    explanation: '3 × 4 = 12',
  });

  it('exposes kind and prompt', () => {
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('3 × 4 = ?');
    expect(step.suffix).toBeUndefined();
  });

  it('accepts the exact answer and equivalent notation', () => {
    expect(step.check('12')).toEqual({ correct: true, expected: '12', explanation: '3 × 4 = 12' });
    expect(step.check('012').correct).toBe(true);
  });

  it('rejects a wrong answer and reports the expected one', () => {
    expect(step.check('13')).toEqual({
      correct: false,
      expected: '12',
      explanation: '3 × 4 = 12',
    });
  });

  it('rejects unparsable input', () => {
    expect(step.check('').correct).toBe(false);
    expect(step.check('-').correct).toBe(false);
  });

  it('compares decimals exactly', () => {
    const quarter = numberStep({ prompt: '250 ml = ? L', answer: rational(1n, 4n), suffix: 'L' });
    expect(quarter.suffix).toBe('L');
    expect(quarter.check(',25').correct).toBe(true);
    expect(quarter.check('0,250').correct).toBe(true);
    expect(quarter.check('0,26').correct).toBe(false);
    expect(quarter.check('0,26').expected).toBe('0,25');
  });
});

describe('numberStep options', () => {
  it('passes a prefix and shows a custom expected answer', () => {
    const money = numberStep({
      prompt: '€ 30 na 15% korting = ?',
      answer: rational(51n, 2n),
      prefix: '€',
      expected: '25,50',
    });
    expect(money.prefix).toBe('€');
    expect(money.check('25,5')).toEqual({ correct: true, expected: '25,50' });
    expect(money.check('25,50').correct).toBe(true);
    expect(money.check('25').expected).toBe('25,50');
  });

  it('has no prefix by default', () => {
    expect(numberStep({ prompt: '1 + 1', answer: fromInteger(2) }).prefix).toBeUndefined();
  });

  it('does not accept a fraction', () => {
    const half = numberStep({ prompt: '25 : 2 = ?', answer: rational(25n, 2n) });
    expect(half.check('25/2').correct).toBe(false);
  });
});

describe('parseAnswer', () => {
  it('parses only decimals for number steps', () => {
    expect(parseAnswer('number', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('number', '25/2')).toBeNull();
    expect(parseAnswer('number', '12 1/2')).toBeNull();
  });

  it('parses fractions, mixed numbers and decimals for fraction steps', () => {
    expect(parseAnswer('fraction', '25/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '12 1/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '-12 1/2')).toEqual(rational(-25n, 2n));
    expect(parseAnswer('fraction', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '25/')).toBeNull();
    expect(parseAnswer('fraction', '12 /2')).toBeNull();
    expect(parseAnswer('fraction', '')).toBeNull();
  });
});

describe('fractionStep', () => {
  const percent = fractionStep({
    prompt: '10 is ?% van 80',
    answer: rational(25n, 2n),
    suffix: '%',
    explanation: '12½% = 80 : 8 = 10',
  });

  it('is a fraction step with its suffix', () => {
    expect(percent.kind).toBe('fraction');
    expect(percent.suffix).toBe('%');
  });

  it('accepts every equal fraction and the decimal', () => {
    for (const input of ['25/2', '50/4', '12 1/2', '11 3/2', '12,5', '12,50']) {
      expect(percent.check(input).correct).toBe(true);
    }
    expect(percent.check('12').correct).toBe(false);
    expect(percent.check('1/0').correct).toBe(false);
  });

  it('shows both notations as the expected answer', () => {
    expect(percent.check('12')).toEqual({
      correct: false,
      expected: '12,5 of 25/2',
      explanation: '12½% = 80 : 8 = 10',
    });
  });

  it('shows a whole answer once and accepts it as a fraction', () => {
    const whole = fractionStep({ prompt: '30 is ?% van 120', answer: fromInteger(25), suffix: '%' });
    expect(whole.check('50/2')).toEqual({ correct: true, expected: '25' });
  });

  it('shows only the fraction when there is no finite decimal', () => {
    const third = fractionStep({ prompt: '1 : 3 = ?', answer: rational(1n, 3n) });
    expect(third.check('1/3')).toEqual({ correct: true, expected: '1/3' });
  });
});

describe('booleanStep', () => {
  const step = booleanStep({
    prompt: 'Is 91 een priemgetal?',
    answer: false,
    explanation: '91 = 7 × 13',
  });

  it('is a boolean step answered with Ja or Nee', () => {
    expect(step.kind).toBe('boolean');
    expect(step.prompt).toBe('Is 91 een priemgetal?');
    expect([YES, NO]).toEqual(['Ja', 'Nee']);
  });

  it('accepts the right label and reports the expected one', () => {
    expect(step.check(NO)).toEqual({ correct: true, expected: 'Nee', explanation: '91 = 7 × 13' });
    expect(step.check(YES)).toEqual({ correct: false, expected: 'Nee', explanation: '91 = 7 × 13' });
  });

  it('shows Ja as the expected answer for a true statement', () => {
    expect(booleanStep({ prompt: 'Is 13 een priemgetal?', answer: true }).check(NO).expected).toBe(
      'Ja',
    );
  });
});

describe('parseFactorization', () => {
  it('collects every base with its exponent', () => {
    expect(parseFactorization('2^2×3×7')).toEqual([
      { base: 2n, exponent: 2n },
      { base: 3n, exponent: 1n },
      { base: 7n, exponent: 1n },
    ]);
    expect(parseFactorization('84')).toEqual([{ base: 84n, exponent: 1n }]);
  });

  it.each(['', '2×', '2^', '2,5×2', '2^1,5', '2+3', '(2)', '-2', '2×(-3)'])(
    'rejects %j',
    (input) => {
      expect(parseFactorization(input)).toBeNull();
    },
  );
});

describe('factorizationStep', () => {
  const step = factorizationStep({
    prompt: 'Ontbind 84 in priemfactoren',
    value: 84,
    explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
  });

  it('is a factorization step that shows the canonical form', () => {
    expect(step.kind).toBe('factorization');
    expect(step.check('')).toEqual({
      correct: false,
      expected: '2² × 3 × 7',
      explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    });
  });

  it.each(['2×2×3×7', '2^2×3×7', '7×3×2^2', '3×2^1×7×2'])('accepts %j', (input) => {
    expect(step.check(input).correct).toBe(true);
  });

  it.each([
    '4×3×7',
    '2^2×21',
    '84',
    '2^2×3×7×1',
    '2^0×2^2×3×7',
    '2^3×3×7',
    '2×3×7',
    '2×',
    '',
    '2^99999999999999999999',
  ])('rejects %j', (input) => {
    expect(step.check(input).correct).toBe(false);
  });
});

describe('rewriteStep', () => {
  const example = '7 × 100 − 7 × 2';
  const step = rewriteStep({
    prompt: 'Vereenvoudig in één stap: 7 × 98',
    original: parse('7 × 98')!,
    property: 'distributive',
    example,
    otherProperty: (detected) => `Andere eigenschap: ${detected}`,
  });

  it('is an expression step', () => {
    expect(step.kind).toBe('expression');
    expect(step.prompt).toBe('Vereenvoudig in één stap: 7 × 98');
  });

  it('accepts a single valid application of the property', () => {
    expect(step.check('7×100-7×2')).toEqual({ correct: true, expected: example });
    expect(step.check('7×90+7×8').correct).toBe(true);
  });

  it('explains a valid step with another property with the given hint', () => {
    expect(step.check('98×7')).toEqual({
      correct: false,
      expected: example,
      explanation: 'Andere eigenschap: commutative',
    });
  });

  it.each([
    ['686', 'Schrijf een som op, niet alleen de uitkomst.'],
    ['(7×98)', 'Er is niets veranderd.'],
    ['7×100-7×3', 'Deze stap verandert de uitkomst.'],
    ['7×(100-2)', 'Hier is nog geen eigenschap toegepast.'],
    ['7×100-14', 'Dit zijn meerdere stappen: pas één eigenschap per keer toe.'],
  ])('explains why %j is rejected', (input, explanation) => {
    expect(step.check(input)).toEqual({ correct: false, expected: example, explanation });
  });

  it('explains a reordered subtraction', () => {
    const minus = rewriteStep({
      prompt: 'Pas de commutatieve eigenschap toe: 20 − 5 − 3',
      original: parse('20 − 5 − 3')!,
      property: 'commutative',
      example: '—',
      otherProperty: () => '',
    });
    expect(minus.check('20-3-5').explanation).toBe('Deze eigenschap geldt niet voor − en :.');
  });

  it('rejects input that does not parse, without an explanation', () => {
    expect(step.check('7×')).toEqual({ correct: false, expected: example });
  });
});

describe('number step tips', () => {
  const base = { prompt: '7 × 8 = ?', answer: fromInteger(56) };

  it('uses the step diagnosis first', () => {
    const step = numberStep({
      ...base,
      diagnose: (given) => (given.num === 63n ? 'rij' : undefined),
    });
    expect(step.check('63').tip).toBe('rij');
  });

  it('falls back to the factor-of-ten tip', () => {
    const step = numberStep({ ...base, diagnose: () => undefined });
    expect(step.check('560').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(step.check('57').tip).toBeUndefined();
  });

  it('skips the fallback when asked', () => {
    const step = numberStep({ ...base, noPowerOfTenTip: true });
    expect(step.check('560').tip).toBeUndefined();
  });

  it('gives no tip for a correct or unparsable answer', () => {
    let calls = 0;
    const step = numberStep({
      ...base,
      diagnose: () => {
        calls++;
        return 'tip';
      },
    });
    expect(step.check('56').tip).toBeUndefined();
    expect(step.check(',').tip).toBeUndefined();
    expect(calls).toBe(0);
  });

  it('applies to fraction steps too', () => {
    const step = fractionStep({ prompt: '? %', answer: rational(25n, 2n) });
    expect(step.check('125').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
  });
});

describe('factorization tips', () => {
  const step = factorizationStep({ prompt: 'Ontbind 84 in priemfactoren', value: 84 });

  it.each([
    ['1×2^2×3×7', '1 is geen priemgetal: laat het weg.'],
    ['2^2×21', '21 is geen priemgetal: ontbind het verder.'],
    ['4×3×7', '4 is geen priemgetal: ontbind het verder.'],
    ['2×3^2×5', 'Het product van je factoren is 90, niet 84.'],
    ['2^9×3', 'Het product van je factoren is 1536, niet 84.'],
    ['2^2×3×101', 'Het product van je factoren is 1212, niet 84.'],
    ['2^30', 'Het product van je factoren is groter dan 84.'],
  ])('%s → %s', (input, tip) => {
    expect(step.check(input).tip).toBe(tip);
  });

  it('gives no tip for a correct or unparsable answer', () => {
    expect(step.check('2^2×3×7').tip).toBeUndefined();
    expect(step.check('2××3').tip).toBeUndefined();
  });

  it('names a composite factor above the target', () => {
    expect(step.check('168').tip).toBe('168 is geen priemgetal: ontbind het verder.');
  });

  it('gives no tip when only a factor with exponent 0 makes it wrong', () => {
    const result = step.check('2^2×3×7×5^0');
    expect(result.correct).toBe(false);
    expect(result.tip).toBeUndefined();
  });

  it('stays cheap for base 0 or 1 with a huge exponent', () => {
    expect(step.check('0^999999999999999999').tip).toBe(
      'Het product van je factoren is 0, niet 84.',
    );
    expect(step.check('1^999999999999999999').tip).toBe('1 is geen priemgetal: laat het weg.');
  });

  it('says "groter dan" only for products above a large target too', () => {
    const big = factorizationStep({ prompt: 'Ontbind 2000000', value: 2_000_000 });
    expect(big.check('2^30').tip).toBe(
      'Het product van je factoren is groter dan 2\u{202f}000\u{202f}000.',
    );
  });

  it('stays cheap for a huge exponent', () => {
    expect(step.check('2^99999999').tip).toBe('Het product van je factoren is groter dan 84.');
  });
});

describe('parseScientific', () => {
  it.each([
    ['4,5×10^6', rational(9n, 2n), 6],
    ['10^6', rational(1n), 6],
    ['4,5×10^-3', rational(9n, 2n), -3],
    ['45×10^5', rational(45n), 5],
    [',5×10^2', rational(1n, 2n), 2],
    ['4500000', rational(4_500_000n), null],
  ] as const)('reads %j', (input, coefficient, exponent) => {
    expect(parseScientific(input)).toEqual({ coefficient, exponent });
  });

  it.each(['', '4,5×', '4,5×10', '4,5×10^', '4,5×10^-', '4,5×2^6', '4,5^6', '×10^6', '4,5,5×10^6'])(
    'rejects %j',
    (input) => {
      expect(parseScientific(input)).toBeNull();
    },
  );
});

describe('scientificValue', () => {
  it('multiplies the coefficient by the power of ten', () => {
    expect(scientificValue({ coefficient: rational(9n, 2n), exponent: -3 })).toEqual(
      rational(9n, 2000n),
    );
    expect(scientificValue({ coefficient: rational(1n), exponent: 6 })).toEqual(
      rational(1_000_000n),
    );
  });

  it('is the number itself for a plain number', () => {
    expect(scientificValue({ coefficient: rational(7n), exponent: null })).toEqual(rational(7n));
  });
});

describe('isNormalised', () => {
  it.each([
    [rational(9n, 2n), 6, true],
    [rational(1n), 6, true],
    [rational(999n, 100n), -3, true],
    [rational(10n), 5, false],
    [rational(45n), 5, false],
    [rational(9n, 20n), 7, false],
    [rational(9n, 2n), null, false],
  ] as const)('judges %o × 10^%s as %s', (coefficient, exponent, expected) => {
    expect(isNormalised({ coefficient, exponent })).toBe(expected);
  });
});
