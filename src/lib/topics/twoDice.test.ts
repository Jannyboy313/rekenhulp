import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  COIN_EVENTS,
  DICE_EVENTS,
  coinQuestion,
  diceQuestion,
  generateTwoDice,
  type CoinEvent,
  type DiceEvent,
} from './twoDice';
import { stepOf } from './testHelpers';

const die = (text: string): DiceEvent => DICE_EVENTS.find((event) => event.text === text)!;
const coin = (text: string): CoinEvent => COIN_EVENTS.find((event) => event.text === text)!;

describe('DICE_EVENTS', () => {
  it.each([
    ['een som van 5', 4],
    ['een som van 7', 6],
    ['een som van 8', 5],
    ['een som van 11 of meer', 3],
    ['een som kleiner dan 5', 6],
    ['twee dezelfde getallen', 6],
    ['twee even getallen', 9],
    ['minstens één zes', 11],
    ['geen enkele zes', 25],
    ['een even som', 18],
    ['een product van 12', 4],
  ])('%s has %i of the 36 outcomes', (text, count) => {
    expect(die(text).outcomes).toHaveLength(count);
  });

  it('lists the pairs of a sum in enumeration order (first die first)', () => {
    expect(die('een som van 5').outcomes).toEqual([
      [1, 4],
      [2, 3],
      [3, 2],
      [4, 1],
    ]);
  });
});

describe('COIN_EVENTS', () => {
  it('lists the four events of spec §5.86 in its order', () => {
    expect(COIN_EVENTS.map(({ text }) => text)).toEqual([
      'elke keer kop',
      'precies één keer kop',
      'precies twee keer kop',
      'minstens één keer munt',
    ]);
  });
});

describe('question text and explanation', () => {
  it.each<[string, Question, string, string, string]>([
    [
      'dice: sum of 5',
      diceQuestion(die('een som van 5')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op een som van 5?',
      '1/9',
      `36 uitkomsten; een som van 5: 1 + 4, 2 + 3, 3 + 2, 4 + 1 = 4 uitkomsten → 4/36 = 1/9`,
    ],
    [
      'dice: same numbers',
      diceQuestion(die('twee dezelfde getallen')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op twee dezelfde getallen?',
      '1/6',
      '36 uitkomsten; twee dezelfde getallen: 1-1 t/m 6-6 = 6 uitkomsten → 6/36 = 1/6',
    ],
    [
      'dice: at least one six',
      diceQuestion(die('minstens één zes')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op minstens één zes?',
      '11/36',
      `36 uitkomsten; minstens één zes: 36 ${MINUS} 25 = 11 uitkomsten → 11/36`,
    ],
    [
      'dice: no six',
      diceQuestion(die('geen enkele zes')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op geen enkele zes?',
      '25/36',
      '36 uitkomsten; geen enkele zes: 5 × 5 = 25 uitkomsten → 25/36',
    ],
    [
      'dice: even sum (half of 36)',
      diceQuestion(die('een even som')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op een even som?',
      '1/2',
      '36 uitkomsten; een even som: de helft van 36 = 18 uitkomsten → 18/36 = 1/2',
    ],
    [
      'dice: product of 12',
      diceQuestion(die('een product van 12')),
      'Je gooit met twee dobbelstenen. Hoe groot is de kans op een product van 12?',
      '1/9',
      '36 uitkomsten; een product van 12: 2 × 6, 3 × 4, 4 × 3, 6 × 2 = 4 uitkomsten → 4/36 = 1/9',
    ],
    [
      'coins n=3: exactly one head',
      coinQuestion(3, coin('precies één keer kop')),
      'Je gooit 3 keer een munt op. Hoe groot is de kans op precies één keer kop?',
      '3/8',
      '2 × 2 × 2 = 8 uitkomsten; precies één keer kop: KMM, MKM, MMK = 3 uitkomsten → 3/8',
    ],
    [
      'coins n=3: all heads',
      coinQuestion(3, coin('elke keer kop')),
      'Je gooit 3 keer een munt op. Hoe groot is de kans op elke keer kop?',
      '1/8',
      '2 × 2 × 2 = 8 uitkomsten; elke keer kop: KKK = 1 uitkomst → 1/8',
    ],
    [
      'coins n=3: at least one tails',
      coinQuestion(3, coin('minstens één keer munt')),
      'Je gooit 3 keer een munt op. Hoe groot is de kans op minstens één keer munt?',
      '7/8',
      `2 × 2 × 2 = 8 uitkomsten; minstens één keer munt: alles behalve KKK → 8 ${MINUS} 1 = 7 → 7/8`,
    ],
    [
      'coins n=3: exactly two heads',
      coinQuestion(3, coin('precies twee keer kop')),
      'Je gooit 3 keer een munt op. Hoe groot is de kans op precies twee keer kop?',
      '3/8',
      '2 × 2 × 2 = 8 uitkomsten; precies twee keer kop: KKM, KMK, MKK = 3 uitkomsten → 3/8',
    ],
    [
      'coins n=4: exactly one head (simplified)',
      coinQuestion(4, coin('precies één keer kop')),
      'Je gooit 4 keer een munt op. Hoe groot is de kans op precies één keer kop?',
      '1/4',
      '2 × 2 × 2 × 2 = 16 uitkomsten; precies één keer kop: KMMM, MKMM, MMKM, MMMK = 4 uitkomsten → 4/16 = 1/4',
    ],
    [
      'coins n=4: exactly two heads',
      coinQuestion(4, coin('precies twee keer kop')),
      'Je gooit 4 keer een munt op. Hoe groot is de kans op precies twee keer kop?',
      '3/8',
      '2 × 2 × 2 × 2 = 16 uitkomsten; precies twee keer kop: KKMM, KMKM, KMMK, MKKM, MKMK, MMKK = 6 uitkomsten → 6/16 = 3/8',
    ],
  ])('%s', (_label, question, prompt, answer, explanation) => {
    const step = stepOf(question);
    expect(step.prompt).toBe(prompt);
    expect(step.kind).toBe('fraction');
    expect(step.check(answer)).toMatchObject({ correct: true, expected: answer, explanation });
  });

  it('uses the event and the number of throws in the key', () => {
    expect(diceQuestion(die('een som van 5')).key).toBe('twoDice:dice:een som van 5');
    expect(coinQuestion(3, coin('elke keer kop')).key).toBe('twoDice:coins:3:elke keer kop');
    expect(coinQuestion(4, coin('elke keer kop')).key).toBe('twoDice:coins:4:elke keer kop');
  });
});

describe('generateTwoDice', () => {
  const GENERATIONS = 1000;
  const PROMPT = /^Je gooit (met twee dobbelstenen|\d keer een munt op)\. Hoe groot is de kans op .+\?$/;

  it('draws valid, distinct and correctly checked exercises over 1000 generations', () => {
    const rng = createRng(20261102);
    const keys = new Set<string>();
    for (let i = 0; i < GENERATIONS; i++) {
      const question = generateTwoDice(rng);
      const step = stepOf(question);
      expect(question.topic).toBe('twoDice');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('fraction');
      expect(step.prompt).toMatch(PROMPT);
      expect(step.prompt.length).toBeLessThanOrEqual(170);

      const expected = step.check('').expected;
      expect(expected).toMatch(/^\d+\/\d+$/);
      expect(step.check(expected)).toMatchObject({ correct: true, expected });
      expect(step.check('0').correct).toBe(false);
      expect(step.check('').explanation).toMatch(/ → \d+\/\d+/);

      keys.add(question.key);
    }
    // 11 dice events plus 4 coin events for 3 and for 4 throws.
    expect(keys.size).toBe(DICE_EVENTS.length + 2 * COIN_EVENTS.length);
  });
});
