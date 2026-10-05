import type { Generator, Topic } from '../types';
import {
  generateArea,
  generateLength,
  generateMass,
  generateTime,
  generateVolume,
} from './measurement';
import { generateNumberUnits } from './numberUnits';
import { generatePercentages } from './percentages';
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
};
