import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S } from '../format';
import { createRng } from '../random';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  densityQuestion,
  flowQuestion,
  FLOW_CONTEXTS,
  fuelQuestion,
  generateCompoundUnits,
  SPEED_CONTEXTS,
  speedDistanceQuestion,
  speedFromMetresQuestion,
} from './compoundUnits';
import { stepOf } from './testHelpers';

const SAMPLES = 2000;

/** What the user types for a formatted number: no group separator. */
const typed = (text: string) => text.replaceAll(S, '');

describe('speed from metres', () => {
  it('asks the speed in km/u for a distance in m', () => {
    const step = stepOf(speedFromMetresQuestion('hardloper', 10, 'min', 3));
    expect(step.prompt).toBe('Een hardloper rent 500 m in 3 min. Hoe snel is dat in km/u?');
    expect(step.suffix).toBe('km/u');
    expect(step.check('10')).toEqual({
      correct: true,
      expected: '10',
      explanation: `3 min → 500 m, 60 min → 10${S}000 m = 10 km`,
    });
  });

  it('works with seconds', () => {
    const step = stepOf(speedFromMetresQuestion('wielrenner', 24, 's', 30));
    expect(step.prompt).toBe('Een wielrenner fietst 200 m in 30 s. Hoe snel is dat in km/u?');
    expect(step.check('24').explanation).toBe(`30 s → 200 m, 3600 s → 24${S}000 m = 24 km`);
  });

  it('writes a long distance in km', () => {
    const step = stepOf(speedFromMetresQuestion('hardloper', 15, 'min', 30));
    expect(step.prompt).toBe('Een hardloper rent 7,5 km in 30 min. Hoe snel is dat in km/u?');
    expect(step.check('15').explanation).toBe('30 min → 7,5 km, 60 min → 15 km');
  });
});

describe('speed of a vehicle', () => {
  it('asks the distance in km', () => {
    const step = stepOf(speedDistanceQuestion('trein', 96, 10));
    expect(step.prompt).toBe('Een trein rijdt 96 km/u. Hoeveel km rijdt de trein in 10 minuten?');
    expect(step.suffix).toBe('km');
    expect(step.check('16')).toEqual({
      correct: true,
      expected: '16',
      explanation: '60 min → 96 km, 10 min → 16 km',
    });
  });
});

describe('density', () => {
  it('asks the density, the inhabitants or the area', () => {
    const density = stepOf(densityQuestion('density', 40, 1200));
    expect(density.prompt).toBe(
      `Een gemeente heeft 48${S}000 inwoners en is 40 km² groot. Hoeveel inwoners per km² is dat?`,
    );
    expect(density.suffix).toBe('per km²');
    expect(density.check('1200')).toEqual({
      correct: true,
      expected: '1200',
      explanation: `48${S}000 : 40 = 1200`,
    });

    const inhabitants = stepOf(densityQuestion('inhabitants', 40, 1200));
    expect(inhabitants.prompt).toBe(
      'Een gemeente is 40 km² groot en heeft 1200 inwoners per km². Hoeveel inwoners heeft de gemeente?',
    );
    expect(inhabitants.suffix).toBe('inwoners');
    expect(inhabitants.check('48000').correct).toBe(true);
    expect(inhabitants.check('1').explanation).toBe(`1200 × 40 = 48${S}000`);

    const area = stepOf(densityQuestion('area', 40, 1200));
    expect(area.prompt).toBe(
      `Een gemeente heeft 48${S}000 inwoners, 1200 per km². Hoe groot is de gemeente?`,
    );
    expect(area.suffix).toBe('km²');
    expect(area.check('40').correct).toBe(true);
    expect(area.check('1').explanation).toBe(`48${S}000 : 1200 = 40`);
  });
});

describe('flow', () => {
  it('asks the time to fill a bad', () => {
    const step = stepOf(flowQuestion('time', 'bad', 12, 15));
    expect(step.prompt).toBe(
      'Een kraan geeft 12 liter per minuut. Hoeveel minuten duurt het om een bad van 180 L te vullen?',
    );
    expect(step.suffix).toBe('min');
    expect(step.check('15')).toEqual({
      correct: true,
      expected: '15',
      explanation: '180 : 12 = 15',
    });
  });

  it('asks the volume after some minutes', () => {
    const step = stepOf(flowQuestion('volume', 'bad', 12, 15));
    expect(step.prompt).toBe(
      'Een kraan geeft 12 liter per minuut. Hoeveel liter zit er na 15 minuten in het bad?',
    );
    expect(step.check('180').explanation).toBe('12 × 15 = 180');
  });

  it('asks the rate per hour with a slot', () => {
    const question = flowQuestion('perHour', 'bad', 12, 0);
    expect(hasSlot(question.steps[0]!.prompt)).toBe(true);
    const step = stepOf(question);
    expect(step.prompt).toBe('12 liter per minuut = ? liter per uur');
    expect(step.suffix).toBe('L per uur');
    expect(step.check('720')).toEqual({
      correct: true,
      expected: '720',
      explanation: '1 uur = 60 min → 12 × 60 = 720',
    });
  });

  it('uses the definite article of the context', () => {
    expect(stepOf(flowQuestion('volume', 'regenton', 10, 20)).prompt).toContain('in de regenton?');
    expect(stepOf(flowQuestion('volume', 'aquarium', 10, 10)).prompt).toContain('in het aquarium?');
  });
});

describe('fuel', () => {
  it('asks the liters, the distance or the cost', () => {
    const liters = stepOf(fuelQuestion('liters', 15, 16));
    expect(liters.prompt).toBe(
      `Een auto rijdt 1 op 15: op 1 liter benzine rijdt hij 15 km. Hoeveel liter heeft hij nodig voor 240 km?`,
    );
    expect(liters.suffix).toBe('L');
    expect(liters.check('16').explanation).toBe('240 : 15 = 16');

    const distance = stepOf(fuelQuestion('distance', 15, 40));
    expect(distance.prompt).toContain('Hoe ver komt hij met 40 liter?');
    expect(distance.suffix).toBe('km');
    expect(distance.check('600').explanation).toBe('40 × 15 = 600');

    const cost = stepOf(fuelQuestion('cost', 15, 16, 200));
    expect(cost.prompt).toContain(
      'Benzine kost €\u{a0}2 per liter. Wat kost de benzine voor 240 km?',
    );
    expect(cost.prefix).toBe('€');
    expect(cost.check('32').explanation).toBe('240 : 15 = 16 L → 16 × €\u{a0}2 = €\u{a0}32');
  });

  it('shows the answer in cents and accepts one decimal', () => {
    const step = stepOf(fuelQuestion('cost', 15, 16, 190));
    expect(step.check('').expected).toBe('30,40');
    expect(step.check('30,4').correct).toBe(true);
    expect(step.check('30,40').correct).toBe(true);
  });
});

describe('generateCompoundUnits', () => {
  const rng = createRng(12);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateCompoundUnits(rng));
  const kind = (name: string) =>
    questions.filter((q) => q.key.startsWith(`compoundUnits:${name}:`));

  it('uses the four forms about equally often', () => {
    const speed = [...kind('speed'), ...kind('distance')];
    for (const form of [speed, kind('density'), kind('flow'), kind('fuel')]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.2);
      expect(form.length / SAMPLES).toBeLessThan(0.3);
    }
  });

  it('accepts its own answer and explains it', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('compoundUnits');
      const result = step.check(typed(step.check('').expected));
      expect(result.correct, step.prompt).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('keeps speeds from metres to whole multiples of 10 m and known speeds', () => {
    const forms = kind('speed');
    expect(forms.length).toBeGreaterThan(100);
    for (const question of forms) {
      const [, , context, speed, time] = question.key.split(':');
      expect(SPEED_CONTEXTS[context!]!.speeds).toContain(Number(speed));
      const prompt = stepOf(question).prompt;
      const [, amount, unit] = prompt.match(/ (\S+) (m|km) in /)!;
      const metres = unit === 'm' ? Number(amount) : Number(amount!.replace(',', '.')) * 1000;
      expect(metres).toBeGreaterThanOrEqual(100);
      expect(metres).toBeLessThanOrEqual(10_000);
      expect(metres % (metres >= 1000 ? 100 : 10)).toBe(0);
      expect(time).toMatch(/^\d+(min|s)$/);
    }
    expect(new Set(forms.map((q) => q.key.split(':')[2]))).toEqual(
      new Set(Object.keys(SPEED_CONTEXTS)),
    );
    expect(forms.some((q) => q.key.endsWith('s'))).toBe(true);
  });

  it('keeps vehicle speeds a multiple of 12 and a bus at most 84', () => {
    for (const question of kind('distance')) {
      const [, , vehicle, speed] = question.key.split(':');
      expect(Number(speed) % 12).toBe(0);
      expect(Number(speed)).toBeGreaterThanOrEqual(36);
      expect(Number(speed)).toBeLessThanOrEqual(vehicle === 'bus' ? 84 : 144);
    }
    expect(new Set(kind('distance').map((q) => q.key.split(':')[2]))).toEqual(
      new Set(['trein', 'auto', 'bus']),
    );
  });

  it('keeps density in range and covers every variant', () => {
    const variants = new Set<string>();
    for (const question of kind('density')) {
      const [, , variant, area, density] = question.key.split(':');
      variants.add(variant!);
      const inhabitants = Number(area) * Number(density);
      expect(inhabitants).toBeGreaterThanOrEqual(2000);
      expect(inhabitants).toBeLessThanOrEqual(900_000);
      expect(Number(density)).toBeGreaterThanOrEqual(100);
      expect(Number(density)).toBeLessThanOrEqual(5000);
      expect(String(density).replace(/0+$/, '').length).toBeLessThanOrEqual(2);
    }
    expect(variants).toEqual(new Set(['density', 'inhabitants', 'area']));
  });

  it('keeps flow in range and covers every variant and context', () => {
    const variants = new Set<string>();
    const contexts = new Set<string>();
    for (const question of kind('flow')) {
      const [, , variant, context, rate, time] = question.key.split(':');
      variants.add(variant!);
      contexts.add(context!);
      if (variant === 'perHour') continue;
      const { min, max } = FLOW_CONTEXTS[context!]!;
      const volume = Number(rate) * Number(time);
      expect(volume).toBeGreaterThanOrEqual(min);
      expect(volume).toBeLessThanOrEqual(max);
      expect(Number(time)).toBeGreaterThanOrEqual(variant === 'time' ? 4 : 2);
      expect(Number(time)).toBeLessThanOrEqual(variant === 'time' ? 40 : 30);
    }
    expect(variants).toEqual(new Set(['time', 'volume', 'perHour']));
    expect(contexts).toEqual(new Set(Object.keys(FLOW_CONTEXTS)));
  });

  it('keeps fuel liters in [4, 50] and the distance at most 1000 km', () => {
    const variants = new Set<string>();
    for (const question of kind('fuel')) {
      const [, , variant, efficiency, liters] = question.key.split(':');
      variants.add(variant!);
      expect([12, 15, 16, 18, 20, 25]).toContain(Number(efficiency));
      expect(Number(liters)).toBeGreaterThanOrEqual(4);
      expect(Number(liters)).toBeLessThanOrEqual(50);
      expect(Number(efficiency) * Number(liters)).toBeLessThanOrEqual(1000);
    }
    expect(variants).toEqual(new Set(['liters', 'distance', 'cost']));
  });

  it('answers whole numbers except for money', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      if (step.prefix === '€') continue;
      expect(step.check('').expected).not.toContain(',');
    }
  });
});
