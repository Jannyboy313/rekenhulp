import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  arrivalQuestion,
  departureQuestion,
  durationText,
  generateTimeCalc,
  journeyQuestion,
  shiftExplanation,
  workdayQuestion,
} from './timeCalc';
import { stepOf } from './testHelpers';

const SAMPLES = 2000;
const at = (hours: number, minutes: number) => hours * 60 + minutes;

describe('durationText', () => {
  it.each([
    [145, false, '145 minuten'],
    [145, true, '2 uur en 25 minuten'],
    [120, true, '2 uur'],
    [65, true, '1 uur en 5 minuten'],
    [61, true, '1 uur en 1 minuut'],
    [45, true, '45 minuten'],
    [60, true, '60 minuten'],
  ])('%i (mixed %s) → %s', (minutes, mixed, text) => {
    expect(durationText(minutes, mixed)).toBe(text);
  });
});

describe('shiftExplanation', () => {
  it.each([
    [
      at(19, 45),
      145,
      'later',
      false,
      '145 min = 2 uur en 25 min → 19:45 + 2 uur = 21:45 → 21:45 + 15 min = 22:00 → 22:00 + 10 min = 22:10',
    ],
    [
      at(19, 45),
      145,
      'later',
      true,
      '19:45 + 2 uur = 21:45 → 21:45 + 15 min = 22:00 → 22:00 + 10 min = 22:10',
    ],
    [at(23, 40), 50, 'later', false, '23:40 + 20 min = 0:00 → 0:00 + 30 min = 0:30'],
    [at(8, 50), 35, 'earlier', false, `8:50 ${MINUS} 35 min = 8:15`],
    [
      at(9, 10),
      25,
      'earlier',
      false,
      `9:10 ${MINUS} 25 min → 9:10 ${MINUS} 10 min = 9:00 → 9:00 ${MINUS} 15 min = 8:45`,
    ],
    [
      at(14, 30),
      75,
      'earlier',
      false,
      `75 min = 1 uur en 15 min → 14:30 ${MINUS} 1 uur = 13:30 → 13:30 ${MINUS} 15 min = 13:15`,
    ],
    [at(10, 0), 120, 'later', false, '120 min = 2 uur → 10:00 + 2 uur = 12:00'],
    [at(9, 0), 25, 'earlier', false, `9:00 ${MINUS} 25 min = 8:35`],
  ] as const)('%i + %i %s', (from, minutes, direction, givenMixed, text) => {
    expect(shiftExplanation(from, minutes, direction, givenMixed)).toBe(text);
  });
});

describe('arrival', () => {
  it('asks when the film is over', () => {
    const step = stepOf(arrivalQuestion('film', at(19, 45), 145, false, 10));
    expect(step.prompt).toBe(
      'De film begint om 19:45 en duurt 145 minuten. Hoe laat is de film afgelopen?',
    );
    expect(step.options).toEqual(['21:10', '22:10', '22:20', '23:10']);
    expect(step.check('22:10').correct).toBe(true);
    expect(step.check('21:10').explanation).toBe(
      '145 min = 2 uur en 25 min → 19:45 + 2 uur = 21:45 → 21:45 + 15 min = 22:00 → 22:00 + 10 min = 22:10',
    );
    expect(stepOf(arrivalQuestion('film', at(19, 45), 145, false, -10)).options).toEqual([
      '21:10',
      '22:00',
      '22:10',
      '23:10',
    ]);
  });

  it('writes the duration in hours and minutes', () => {
    const step = stepOf(arrivalQuestion('film', at(19, 45), 145, true, 10));
    expect(step.prompt).toContain('en duurt 2 uur en 25 minuten.');
    expect(step.check('').explanation!.startsWith('19:45 + 2 uur = 21:45')).toBe(true);
  });

  it('orders the options across midnight', () => {
    const step = stepOf(arrivalQuestion('nachtbus', at(23, 40), 50, false, 10));
    expect(step.prompt).toBe(
      'De nachtbus vertrekt om 23:40 en rijdt 50 minuten. Hoe laat komt de bus aan?',
    );
    expect(step.options).toEqual(['23:30', '0:30', '0:40', '1:30']);
    expect(step.check('0:30').correct).toBe(true);
    expect(stepOf(arrivalQuestion('nachtbus', at(23, 40), 50, false, -10)).options).toEqual([
      '23:30',
      '0:20',
      '0:30',
      '1:30',
    ]);
  });

  it('words the treinreis', () => {
    expect(stepOf(arrivalQuestion('treinreis', at(9, 47), 95, false, 10)).prompt).toBe(
      'De trein vertrekt om 9:47 en de reis duurt 95 minuten. Hoe laat komt de trein aan?',
    );
  });
});

describe('departure', () => {
  it('asks when to leave for school', () => {
    const step = stepOf(departureQuestion('school', at(8, 50), 35, false, 10));
    expect(step.prompt).toBe(
      'Je moet om 8:50 op school zijn en fietst 35 minuten. Hoe laat moet je vertrekken?',
    );
    expect(step.check('8:15').correct).toBe(true);
    expect(step.check('7:15').explanation).toBe(`8:50 ${MINUS} 35 min = 8:15`);
  });

  it('asks when to leave for an afspraak and when someone left by train', () => {
    const afspraak = stepOf(departureQuestion('afspraak', at(14, 30), 75, false, 10));
    expect(afspraak.prompt).toBe(
      'Je hebt om 14:30 een afspraak en de reis duurt 75 minuten. Hoe laat moet je vertrekken?',
    );
    expect(afspraak.check('13:15').correct).toBe(true);
    expect(stepOf(departureQuestion('trein', at(18, 12), 95, false, 10)).prompt).toBe(
      'Je trein komt om 18:12 aan en de reis duurt 95 minuten. Hoe laat ben je vertrokken?',
    );
  });
});

describe('duration', () => {
  it('asks the minutes of a journey', () => {
    const step = stepOf(journeyQuestion(at(9, 47), at(11, 22)));
    expect(step.prompt).toBe(
      'De trein vertrekt om 9:47 en komt om 11:22 aan. Hoeveel minuten duurt de reis?',
    );
    expect(step.suffix).toBe('min');
    expect(step.check('95')).toEqual({
      correct: true,
      expected: '95',
      explanation:
        '9:47 → 10:00 is 13 min, 10:00 → 11:00 is 60 min, 11:00 → 11:22 is 22 min → 13 + 60 + 22 = 95',
    });
  });

  it('asks the hours of a werkdag', () => {
    const step = stepOf(workdayQuestion(at(8, 30), at(17, 15), 45));
    expect(step.prompt).toBe(
      'Je werkt van 8:30 tot 17:15 en hebt 45 minuten pauze. Hoeveel uur werk je?',
    );
    expect(step.suffix).toBe('uur');
    expect(step.check('8')).toEqual({
      correct: true,
      expected: '8',
      explanation: '8:30 → 17:15 is 8 uur en 45 min → min 45 min pauze = 8 uur',
    });
    const half = stepOf(workdayQuestion(at(8, 0), at(16, 0), 30));
    expect(half.check('7,5')).toEqual({
      correct: true,
      expected: '7,5',
      explanation: '8:00 → 16:00 is 8 uur → min 30 min pauze = 7 uur en 30 min = 7,5 uur',
    });
  });
});

describe('generateTimeCalc', () => {
  const rng = createRng(17);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateTimeCalc(rng));
  const kind = (name: string) => questions.filter((q) => q.key.startsWith(`timeCalc:${name}:`));
  const minutesOf = (text: string) => {
    const [hours, minutes] = text.split(':').map(Number);
    return hours! * 60 + minutes!;
  };

  it('uses arrival, departure and duration about equally often', () => {
    const duration = [...kind('reis'), ...kind('werkdag')];
    for (const form of [kind('arrival'), kind('departure'), duration]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.28);
      expect(form.length / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('accepts its own answer, with four unique options for the choice forms', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('timeCalc');
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      if (step.kind === 'choice') {
        expect(new Set(step.options).size).toBe(4);
        expect(step.options).toContain(step.check('').expected);
      }
    }
  });

  it('keeps arrivals and departures within the spec ranges', () => {
    for (const question of kind('arrival')) {
      const [, , context, start, duration] = question.key.split(':');
      const [from, length] = [Number(start), Number(duration)];
      if (context === 'film') {
        expect(from % 5).toBe(0);
        expect(from).toBeGreaterThanOrEqual(at(13, 0));
        expect(from).toBeLessThanOrEqual(at(21, 30));
        expect(length % 5).toBe(0);
        expect(length).toBeGreaterThanOrEqual(85);
        expect(length).toBeLessThanOrEqual(180);
      } else if (context === 'treinreis') {
        expect(from).toBeGreaterThanOrEqual(at(6, 0));
        expect(from).toBeLessThanOrEqual(at(22, 0));
        expect(length).toBeGreaterThanOrEqual(20);
        expect(length).toBeLessThanOrEqual(150);
      } else {
        expect(context).toBe('nachtbus');
        expect(from).toBeGreaterThanOrEqual(at(23, 0));
        expect(from).toBeLessThanOrEqual(at(23, 55));
        expect(length).toBeGreaterThanOrEqual(15);
        expect(length).toBeLessThanOrEqual(75);
        expect(from + length).toBeGreaterThanOrEqual(1440);
        expect(minutesOf(question.steps[0]!.check('').expected)).toBeLessThan(120);
      }
    }
    for (const question of kind('departure')) {
      const [, , context, arrival, duration] = question.key.split(':');
      const [to, length] = [Number(arrival), Number(duration)];
      if (context === 'school') {
        expect(to % 5).toBe(0);
        expect(to).toBeGreaterThanOrEqual(at(8, 15));
        expect(to).toBeLessThanOrEqual(at(8, 45));
        expect(length).toBeGreaterThanOrEqual(10);
        expect(length).toBeLessThanOrEqual(45);
      } else if (context === 'afspraak') {
        expect(to % 5).toBe(0);
        expect(to).toBeGreaterThanOrEqual(at(9, 0));
        expect(to).toBeLessThanOrEqual(at(20, 0));
        expect(length % 5).toBe(0);
        expect(length).toBeGreaterThanOrEqual(15);
        expect(length).toBeLessThanOrEqual(120);
      } else {
        expect(context).toBe('trein');
        expect(to).toBeGreaterThanOrEqual(at(7, 0));
        expect(to).toBeLessThanOrEqual(at(23, 0));
        expect(length).toBeGreaterThanOrEqual(20);
        expect(length).toBeLessThanOrEqual(150);
      }
    }
  });

  it('covers every context', () => {
    expect(new Set(kind('arrival').map((q) => q.key.split(':')[2]))).toEqual(
      new Set(['film', 'treinreis', 'nachtbus']),
    );
    expect(new Set(kind('departure').map((q) => q.key.split(':')[2]))).toEqual(
      new Set(['school', 'afspraak', 'trein']),
    );
  });

  it('writes hours and minutes only above 60 minutes', () => {
    let mixed = 0;
    for (const question of [...kind('arrival'), ...kind('departure')]) {
      const prompt = stepOf(question).prompt;
      const duration = Number(question.key.split(':')[4]);
      if (prompt.includes(' uur')) {
        mixed++;
        expect(duration).toBeGreaterThan(60);
      }
    }
    expect(mixed).toBeGreaterThan(100);
  });

  it('keeps journeys and workdays within the spec ranges', () => {
    for (const question of kind('reis')) {
      const [, , start, end] = question.key.split(':').map(Number);
      expect(start!).toBeGreaterThanOrEqual(at(6, 0));
      expect(start!).toBeLessThanOrEqual(at(21, 0));
      expect(end! - start!).toBeGreaterThanOrEqual(20);
      expect(end! - start!).toBeLessThanOrEqual(240);
      expect(end!).toBeLessThan(1440);
    }
    for (const question of kind('werkdag')) {
      const [, , start, end, pause] = question.key.split(':').map(Number);
      expect(start! % 15).toBe(0);
      expect(end! % 15).toBe(0);
      expect(start!).toBeGreaterThanOrEqual(at(7, 0));
      expect(start!).toBeLessThanOrEqual(at(10, 0));
      expect(end!).toBeGreaterThanOrEqual(at(12, 0));
      expect(end!).toBeLessThanOrEqual(at(18, 30));
      expect([30, 45, 60]).toContain(pause);
      const hours = (end! - start! - pause!) / 60;
      expect(hours).toBeGreaterThanOrEqual(4);
      expect(hours).toBeLessThanOrEqual(9);
      expect((hours * 4) % 1).toBe(0);
    }
    expect(kind('reis').length).toBeGreaterThan(100);
    expect(kind('werkdag').length).toBeGreaterThan(100);
  });
});
