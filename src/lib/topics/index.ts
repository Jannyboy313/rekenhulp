import type { Generator, Topic } from '../types';
import { generateArea, generateLength, generateMass, generateVolume } from './measurement';
import { generateTables } from './tables';

export const GENERATORS: Record<Topic, Generator> = {
  tables: generateTables,
  volume: generateVolume,
  area: generateArea,
  length: generateLength,
  mass: generateMass,
};

/** Dutch labels shown on the setup screen. */
export const TOPIC_LABELS: Record<Topic, string> = {
  tables: 'Tafels van 2 t/m 15 (zonder 10)',
  volume: 'Inhoud (ml t/m hl, mm³ t/m m³)',
  area: 'Oppervlakte (mm² t/m km², are, ha)',
  length: 'Lengte (mm t/m km)',
  mass: 'Gewicht (mg t/m ton)',
};
