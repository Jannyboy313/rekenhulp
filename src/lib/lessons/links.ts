import type { Topic } from '../types';
import { LESSONS } from './index';
import type { Lesson, LessonTopic } from './types';

/** A lesson topic, addressed by the set of its lesson and its own id. */
export interface LessonRef {
  setId: string;
  topicId: string;
}

function refs(setId: string, ...topicIds: string[]): LessonRef[] {
  return topicIds.map((topicId) => ({ setId, topicId }));
}

const meten = (...ids: string[]) => refs('meten', ...ids);
const verhoudingen = (...ids: string[]) => refs('verhoudingen', ...ids);
const getallen = (...ids: string[]) => refs('getallen', ...ids);
const bewerkingen = (...ids: string[]) => refs('bewerkingen', ...ids);
const getalbegrip = (...ids: string[]) => refs('getalbegrip', ...ids);
const breuken = (...ids: string[]) => refs('breuken', ...ids);
const meetkunde = (...ids: string[]) => refs('meetkunde', ...ids);
const verbanden = (...ids: string[]) => refs('verbanden', ...ids);
const talstelsels = (...ids: string[]) => refs('talstelsels', ...ids);
const heuristieken = (...ids: string[]) => refs('heuristieken', ...ids);

/**
 * Per practice topic the lesson topics that explain it, most relevant first (lesstof spec §3.2).
 * Partial: a topic without an entry gets no link, so a new set needs no lesson code.
 */
export const LESSON_LINKS: Partial<Record<Topic, readonly LessonRef[]>> = {
  volume: meten('volume'),
  area: meten('area'),
  length: meten('metric'),
  mass: meten('metric'),
  measureProblems: meten('metric'),
  time: meten('time'),
  calendar: meten('time'),
  timeCalc: meten('time'),
  numberUnits: meten('largeNumbers'),
  speed: meten('speed'),
  compoundUnits: meten('speed', 'metersPerSecond'),

  percentages: verhoudingen('percentages'),
  ratios: verhoudingen('ratios'),
  percentChange: verhoudingen('percentChange'),
  scale: verhoudingen('scale'),
  ratioProblems: verhoudingen('ratioProblems'),
  percentProblems: verhoudingen('priceChange', 'percentages'),
  compareRatios: verhoudingen('perUnit', 'ratios'),
  ratioReasoning: verhoudingen('ratios', 'ratioProblems'),

  lcm: getallen('lcm'),
  gcd: getallen('gcd'),
  prime: getallen('primes'),
  factorization: getallen('factorization'),
  divisors: getallen('factorization'),
  divisibility: getallen('digitRules', 'combinedRules', 'chunking'),
  missingDigit: getallen('digitRules'),
  squares: getallen('squares'),
  lcmGcdProblems: getallen('lcm', 'gcd'),
  remainders: [...getalbegrip('remainder'), ...getallen('lcm')],

  orderOfOperations: bewerkingen('orderOfOperations'),
  bracketPlacement: bewerkingen('orderOfOperations'),
  properties: bewerkingen('swapGroup', 'distributive'),
  smartCalculation: bewerkingen('compensation', 'complement', 'splitting'),
  derivedFacts: bewerkingen('distributive'),
  smartCalculationDeep: bewerkingen('distributive'),
  multiStepProblems: getalbegrip('remainder'),

  mentalOperations: getalbegrip('mentalOperations'),
  negativeNumbers: getalbegrip('negativeNumbers'),
  negativeContexts: getalbegrip('negativeNumbers'),
  rounding: getalbegrip('rounding'),
  roundingReasoning: getalbegrip('rounding'),
  estimateCalc: getalbegrip('rounding'),
  powersRoots: getalbegrip('powers', 'negativeExponents', 'roots'),
  powerCalc: getalbegrip('powers', 'roots', 'scientificNotation'),
  scientificNotation: getalbegrip('scientificNotation'),

  fractionConversion: breuken('conversion'),
  fractionArithmetic: breuken('addSubtract', 'multiplyDivide'),
  decimalArithmetic: breuken('decimals'),
  decimalProblems: breuken('decimals'),
  compareFractions: breuken('conversion', 'knownFractions'),
  mixedNotation: breuken('conversion', 'multiplyDivide'),
  fractionProblems: breuken('partOf'),

  perimeterArea: meetkunde('perimeterArea'),
  compositeShapes: meetkunde('perimeterArea'),
  solids: meetkunde('solids'),
  surfaceArea: meetkunde('solids', 'circle'),
  pythagoras: meetkunde('pythagoras'),
  angles: meetkunde('angles'),
  angleReasoning: meetkunde('angles', 'clock'),
  symmetry: meetkunde('symmetry'),
  shapeProperties: meetkunde('quadrilaterals', 'triangles'),

  statistics: verbanden('mean', 'median'),
  statisticsReasoning: verbanden('mean', 'median'),
  statisticsProblems: verbanden('mean'),
  percentagePoints: verbanden('percentagePoints'),
  sequences: verbanden('sequences'),
  formulas: verbanden('formulas'),
  formulaProblems: verbanden('formulas', 'sequences'),
  equations: verbanden('equations'),
  probability: verbanden('probability'),
  twoDice: verbanden('probability'),

  numberSystems: talstelsels('toDecimal', 'fromDecimal'),
  baseReasoning: talstelsels('toDecimal'),
  romanNumerals: talstelsels('romanNumerals'),
  romanCalc: talstelsels('romanNumerals'),

  systematicCounting: heuristieken('systematicCounting'),
  countingCases: heuristieken('systematicCounting'),
  workingBackwards: heuristieken('workingBackwards'),
  backwardsProblems: heuristieken('workingBackwards'),
  guessAndCheck: heuristieken('guessAndCheck'),
  twoUnknowns: heuristieken('guessAndCheck'),
  simplifyProblem: heuristieken('simplifySums', 'figurePatterns'),
  simplifyDeep: heuristieken('simplifySums'),
};

/** The lesson topics linked from a mistake on `topic`, in order; refs that do not resolve drop. */
export function lessonLinksFor(
  topic: Topic,
  lessons: readonly Lesson[] = LESSONS,
  links = LESSON_LINKS,
): LessonTopic[] {
  return (links[topic] ?? []).flatMap((ref) => {
    const lesson = lessons.find((candidate) => candidate.setId === ref.setId);
    const found = lesson?.topics.find((candidate) => candidate.id === ref.topicId);
    return found ? [found] : [];
  });
}
