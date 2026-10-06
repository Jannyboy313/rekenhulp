import type { Generator, Topic } from '../types';
import { generateDivisibility } from './divisibility';
import {
  generateArea,
  generateLength,
  generateMass,
  generateTime,
  generateVolume,
} from './measurement';
import { generateNumberUnits } from './numberUnits';
import { generateFactorization, generateGcd, generateLcm, generatePrime } from './numberTheory';
import { generatePercentages } from './percentages';
import { generateRatios } from './ratios';
import { generateSquares } from './squares';
import { generateTables } from './tables';

export const GENERATORS: Record<Topic, Generator> = {
  tables: generateTables,
  volume: generateVolume,
  area: generateArea,
  length: generateLength,
  mass: generateMass,
  time: generateTime,
  numberUnits: generateNumberUnits,
  percentages: generatePercentages,
  ratios: generateRatios,
  lcm: generateLcm,
  gcd: generateGcd,
  prime: generatePrime,
  factorization: generateFactorization,
  divisibility: generateDivisibility,
  squares: generateSquares,
};

/** Dutch labels shown on the setup screen. */
export const TOPIC_LABELS: Record<Topic, string> = {
  tables: 'Tafels van 2 t/m 15 (zonder 10)',
  volume: 'Inhoud (ml t/m hl, mm³ t/m m³)',
  area: 'Oppervlakte (mm² t/m km², are, ha)',
  length: 'Lengte (mm t/m km)',
  mass: 'Gewicht (mg t/m ton)',
  time: 'Tijd (s, min, uur, dag)',
  numberUnits: 'Grote getallen (duizend t/m quadriljoen)',
  percentages: 'Procenten (deel, percentage, korting/verhoging, terug naar 100%)',
  ratios: 'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
  lcm: 'KGV (kleinste gemene veelvoud)',
  gcd: 'GGD (grootste gemene deler)',
  prime: 'Priemgetal of niet (11 t/m 199)',
  factorization: 'Ontbinden in priemfactoren (12 t/m 200)',
  divisibility: 'Deelbaarheid door 2 t/m 15 (zonder 10)',
  squares: 'Kwadraten en wortels (2² t/m 25²)',
};
