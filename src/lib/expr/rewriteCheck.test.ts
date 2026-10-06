import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { checkRewrite, PROPERTIES, type Property, type RewriteReason } from './rewriteCheck';

function check(original: string, rewritten: string, property: Property | 'any') {
  return checkRewrite(parse(original)!, parse(rewritten)!, property);
}

type Case = [string, Property | 'any', string, RewriteReason | null];

function expectCase([original, property, rewritten, reason]: Case) {
  const result = check(original, rewritten, property);
  expect(result.reason).toBe(reason);
  expect(result.valid).toBe(reason === null);
}

describe('checkRewrite', () => {
  it.each<Case>([
    ['7 × 98', 'distributive', '7 × 100 − 7 × 2', null],
    ['7 × 98', 'distributive', '7 × 90 + 7 × 8', null],
    ['7 × 98', 'distributive', '686', 'valueOnly'],
    ['7 × 98', 'distributive', '98 × 7', 'otherProperty'],
    ['(17 + 25) + 75', 'associative', '17 + (25 + 75)', null],
    ['(17 + 25) + 75', 'associative', '(25 + 75) + 17', 'multipleSteps'],
    ['(17 + 25) + 75', 'commutative', '75 + (17 + 25)', null],
    ['25 × 37 × 4', 'commutative', '25 × 4 × 37', null],
    ['25 × 37 × 4', 'commutative', '(25 × 4) × 37', 'multipleSteps'],
    ['7 × 13 + 7 × 87', 'distributive', '7 × (13 + 87)', null],
    ['20 − 5 − 3', 'commutative', '20 − 3 − 5', 'notForMinusOrDivide'],
    ['(17 + 25) + 75', 'associative', '17 + 25 + 75', 'unchanged'],
    ['7 × 98', 'distributive', '(7 × 100) − (7 × 2)', null],
    ['7 × 98', 'distributive', '7 × (100 − 2)', 'noProperty'],
    ['15 × 99', 'distributive', '15 × 100 − 15', null],
  ])('handles the spec §7.1 case %s, %s: %s', (...row) => {
    expectCase(row);
  });

  it.each<Case>([
    ['7 × 98', 'distributive', '100 × 7 − 2 × 7', null],
    ['7 × 98', 'distributive', '5 × 98 + 2 × 98', null],
    ['7 × 98', 'distributive', '7 × 98', 'unchanged'],
    ['7 × 98', 'distributive', '(7 × 98)', 'unchanged'],
    ['7 × 98', 'distributive', '7 × 100 − 7 × 3', 'valueChanged'],
    ['7 × 98', 'distributive', '7 × 100 − 14', 'multipleSteps'],
    ['6 × (40 + 3)', 'distributive', '6 × 40 + 6 × 3', null],
    ['6 × (40 + 3)', 'distributive', '40 × 6 + 3 × 6', null],
    ['6 × (40 + 3)', 'commutative', '6 × (3 + 40)', null],
    ['6 × (40 + 3)', 'distributive', '(40 + 3) × 6', 'otherProperty'],
    ['7 × 103 − 7 × 3', 'distributive', '7 × (103 − 3)', null],
    ['(13 × 25) × 4', 'associative', '13 × (25 × 4)', null],
    ['25 × 37 × 4', 'associative', '25 × (37 × 4)', null],
    ['(17 + 25) + 75', 'commutative', '(25 + 17) + 75', null],
    ['38 + 57 + 62', 'commutative', '38 + 62 + 57', null],
    ['38 + 57 + 62', 'associative', '38 + (57 + 62)', null],
    ['12 : 3 : 2', 'commutative', '12 : 2 : 3', 'notForMinusOrDivide'],
    ['2 × ((17 + 25) + 75)', 'associative', '2 × (17 + (25 + 75))', null],
    ['7 × 98 + 1', 'distributive', '7 × 100 − 7 × 2 + 1', null],
    ['5 : 1', 'any', '5 : (1 − 1)', 'valueChanged'],
    ['6 × (40 + 3)', 'distributive', '(6 × 40) + (6 × 3)', null],
    ['7 × 13 + 7 × 87', 'commutative', '(7 × 87) + (7 × 13)', null],
    ['7 × 98', 'commutative', '(98 × 7)', null],
    ['7 × 98', 'distributive', '(7 × 100 − 7 × 2)', null],
    ['(25 × 4) × 37', 'associative', '25 × (4 × 37)', null],
    ['7 × 98', 'distributive', '7 × 49 × 2', 'noProperty'],
    ['38 + 57 + 62', 'commutative', '38 + 50 + 7 + 62', 'noProperty'],
    ['7 × 13 + 7', 'distributive', '7 × (13 + 1)', null],
    ['7 × 98', 'distributive', '7 × 100 − 2 × 7', null],
    ['7 × 13 + 7 × 87', 'distributive', '(13 + 87) × 7', null],
    ['7 × 13 + 7 × 87', 'distributive', '7 × (87 + 13)', 'multipleSteps'],
    ['7 × 13 + 7 × 87', 'distributive', '7 × 100', 'multipleSteps'],
    ['38 + 57 + 62', 'any', '38 + 50 + 7 + 62', 'noProperty'],
    ['(17 + 25) + 75', 'associative', '((17 + 25)) + 75', 'unchanged'],
    ['((17 + 25)) + 75', 'associative', '17 + (25 + 75)', null],
    ['7 × 98', 'distributive', '(686)', 'valueOnly'],
    ['20 − 5 − 3', 'any', '20 − (5 − 3)', 'valueChanged'],
  ])('handles %s, %s: %s', (...row) => {
    expectCase(row);
  });

  it('reports the property of a valid step with another property', () => {
    expect(check('7 × 98', '98 × 7', 'distributive')).toEqual({
      valid: false,
      detected: ['commutative'],
      reason: 'otherProperty',
    });
    expect(check('38 + 57 + 62', '38 + (57 + 62)', 'commutative')).toEqual({
      valid: false,
      detected: ['associative'],
      reason: 'otherProperty',
    });
  });

  it('accepts any single property with any', () => {
    expect(check('38 + 57 + 62', '62 + 57 + 38', 'any')).toEqual({
      valid: true,
      detected: ['commutative'],
      reason: null,
    });
    expect(check('(17 + 25) + 75', '17 + (25 + 75)', 'any').detected).toEqual(['associative']);
    expect(check('7 × 98', '7 × 90 + 7 × 8', 'any').detected).toEqual(['distributive']);
  });

  it('lists the properties in a fixed order', () => {
    expect(PROPERTIES).toEqual(['commutative', 'associative', 'distributive']);
  });
});
