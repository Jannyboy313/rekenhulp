import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { SLOT } from '../slot';
import {
  elapsedExplanation,
  elapsedQuestion,
  formatClock,
  generateClock,
  isExcluded,
  partOfDay,
  spokenTime,
  toDigitalQuestion,
  toWordsQuestion,
} from './clock';
import { stepOf } from './testHelpers';

const SAMPLES = 1000;
const at = (hours: number, minutes: number) => hours * 60 + minutes;

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [575, '9:35'],
    [1220, '20:20'],
    [1440, '0:00'],
  ])('%i → %s', (minutes, text) => {
    expect(formatClock(minutes)).toBe(text);
  });
});

describe('spokenTime', () => {
  it.each([
    [at(8, 0), '8 uur'],
    [at(8, 5), 'vijf over 8'],
    [at(8, 15), 'kwart over 8'],
    [at(8, 20), 'tien voor half 9'],
    [at(8, 25), 'vijf voor half 9'],
    [at(8, 30), 'half 9'],
    [at(8, 35), 'vijf over half 9'],
    [at(8, 40), 'tien over half 9'],
    [at(8, 45), 'kwart voor 9'],
    [at(8, 50), 'tien voor 9'],
    [at(8, 55), 'vijf voor 9'],
    [at(0, 0), '12 uur'],
    [at(0, 5), 'vijf over 12'],
    [at(12, 30), 'half 1'],
    [at(12, 45), 'kwart voor 1'],
  ])('%i → %s', (minutes, text) => {
    expect(spokenTime(minutes)).toBe(text);
  });

  it('throws for a time that is no multiple of 5', () => {
    expect(() => spokenTime(at(8, 7))).toThrow();
  });
});

describe('partOfDay', () => {
  it.each([
    [at(0, 0), "'s nachts"],
    [at(5, 59), "'s nachts"],
    [at(6, 0), "'s ochtends"],
    [at(11, 59), "'s ochtends"],
    [at(12, 0), "'s middags"],
    [at(17, 59), "'s middags"],
    [at(18, 0), "'s avonds"],
    [at(23, 59), "'s avonds"],
  ])('%i → %s', (minutes, text) => {
    expect(partOfDay(minutes)).toBe(text);
  });
});

describe('isExcluded', () => {
  it('leaves out the times whose spoken hour lies in the next part of the day', () => {
    expect(isExcluded(at(5, 20))).toBe(true);
    expect(isExcluded(at(23, 55))).toBe(true);
    expect(isExcluded(at(11, 20))).toBe(true);
    expect(isExcluded(at(17, 45))).toBe(true);
    expect(isExcluded(at(5, 15))).toBe(false);
    expect(isExcluded(at(8, 20))).toBe(false);
  });
});

describe('toDigitalQuestion', () => {
  const options = (minutes: number) => toDigitalQuestion(minutes).steps[0]!.options;
  const check = (minutes: number) => stepOf(toDigitalQuestion(minutes)).check('');

  it('lists 4 times in chronological order', () => {
    expect(options(at(20, 20))).toEqual(['8:20', '20:20', '20:40', '21:20']);
    expect(options(at(8, 0))).toEqual(['7:00', '8:00', '9:00', '20:00']);
    expect(options(at(9, 10))).toEqual(['8:50', '9:10', '10:10', '21:10']);
    expect(options(at(0, 5))).toEqual(['0:05', '1:05', '12:05', '23:55']);
  });

  it('asks in words with the part of the day', () => {
    expect(stepOf(toDigitalQuestion(at(20, 20))).prompt).toBe(
      "Hoe laat is tien voor half 9 's avonds?",
    );
  });

  it('explains via the 12-hour time', () => {
    expect(check(at(20, 20))).toMatchObject({
      correct: false,
      expected: '20:20',
      explanation: "tien voor half 9 = 8:20 → 's avonds is dat 20:20",
    });
    expect(check(at(8, 20)).explanation).toBe('tien voor half 9 = 8:20');
    expect(check(at(8, 0)).explanation).toBe('8 uur = 8:00');
    expect(check(at(0, 5)).explanation).toBe("vijf over 12 's nachts = 0:05");
  });

  it('accepts the answer', () => {
    expect(stepOf(toDigitalQuestion(at(20, 20))).check('20:20').correct).toBe(true);
  });
});

describe('toWordsQuestion', () => {
  const question = (minutes: number) => toWordsQuestion(minutes, createRng(4));

  it('lists the answer, the lower hour, the mirror and the other part of the day', () => {
    const step = question(at(19, 35)).steps[0]!;
    expect(step.prompt).toBe('Hoe zeg je 19:35?');
    expect([...step.options!].sort()).toEqual(
      [
        "vijf over half 8 's avonds",
        "vijf over half 7 's avonds",
        "vijf voor half 8 's avonds",
        "vijf over half 8 's ochtends",
      ].sort(),
    );
    expect(step.check("vijf over half 8 's avonds").correct).toBe(true);
    expect(step.check('').explanation).toBe("19:35 = 7:35 → vijf over half 8 's avonds");
  });

  it('replaces the mirror of :30 by the next hour', () => {
    const step = question(at(14, 30)).steps[0]!;
    expect([...step.options!].sort()).toEqual(
      ["half 3 's middags", "half 2 's middags", "half 4 's middags", "half 3 's nachts"].sort(),
    );
  });

  it('writes only the spoken form when both notations are equal', () => {
    expect(question(at(8, 20)).steps[0]!.check('').explanation).toBe(
      "8:20 → tien voor half 9 's ochtends",
    );
  });
});

describe('elapsedExplanation', () => {
  it.each([
    [at(9, 45), at(10, 20), '9:45 → 10:00 is 15 min, 10:00 → 10:20 is 20 min → 15 + 20 = 35'],
    [
      at(9, 45),
      at(11, 20),
      '9:45 → 10:00 is 15 min, 10:00 → 11:00 is 60 min, 11:00 → 11:20 is 20 min → 15 + 60 + 20 = 95',
    ],
    [at(10, 0), at(11, 15), '10:00 → 11:00 is 60 min, 11:00 → 11:15 is 15 min → 60 + 15 = 75'],
    [
      at(9, 47),
      at(13, 22),
      '9:47 → 10:00 is 13 min, 10:00 → 13:00 is 180 min, 13:00 → 13:22 is 22 min → 13 + 180 + 22 = 215',
    ],
    [at(9, 45), at(10, 0), '9:45 → 10:00 is 15 min'],
  ])('%i → %i', (start, end, text) => {
    expect(elapsedExplanation(start, end)).toBe(text);
  });
});

describe('elapsedQuestion', () => {
  it('asks the minutes between two times', () => {
    const step = stepOf(elapsedQuestion(at(9, 45), at(10, 20)));
    expect(step.prompt).toBe('Van 9:45 tot 10:20. Hoeveel minuten is dat?');
    expect(step.suffix).toBe('min');
    expect(step.check('35').correct).toBe(true);
  });
});

describe('generateClock', () => {
  const rng = createRng(8);
  const questions = Array.from({ length: SAMPLES }, () => generateClock(rng));
  const form = (name: string) => questions.filter((q) => q.key.startsWith(`clock:${name}:`));

  it('uses the three forms about equally often', () => {
    for (const name of ['toDigital', 'toWords', 'elapsed']) {
      expect(form(name).length / SAMPLES).toBeGreaterThan(0.26);
      expect(form(name).length / SAMPLES).toBeLessThan(0.41);
    }
  });

  it('never uses an excluded time and gives four unique options with the answer', () => {
    for (const question of [...form('toDigital'), ...form('toWords')]) {
      const minutes = Number(question.key.split(':')[2]);
      expect(minutes % 5).toBe(0);
      expect(isExcluded(minutes)).toBe(false);
      const step = question.steps[0]!;
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options).toContain(step.check('').expected);
    }
  });

  it('sorts the words → digital options by the minute of the day', () => {
    const toMinutes = (text: string) => {
      const [hours, minutes] = text.split(':').map(Number);
      return hours! * 60 + minutes!;
    };
    for (const question of form('toDigital')) {
      const times = question.steps[0]!.options!.map(toMinutes);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it('keeps the elapsed times in range and across a full hour', () => {
    for (const question of form('elapsed')) {
      const [, , start, end] = question.key.split(':').map(Number);
      const duration = end! - start!;
      expect(start! % 5).toBe(0);
      expect(start!).toBeGreaterThanOrEqual(360);
      expect(start!).toBeLessThanOrEqual(1320);
      expect(duration % 5).toBe(0);
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(95);
      expect(start! % 60 + duration).toBeGreaterThanOrEqual(60);
      expect(end!).toBeLessThan(1440);
      expect(question.steps[0]!.suffix).toBe('min');
    }
  });

  it('never shows a slot in the choice forms', () => {
    for (const question of [...form('toDigital'), ...form('toWords')]) {
      expect(question.steps[0]!.prompt).not.toContain(SLOT);
    }
  });
});
