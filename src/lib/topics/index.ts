import type { Generator, Topic } from '../types';
import { generateTables } from './tables';

export const GENERATORS: Record<Topic, Generator> = {
  tables: generateTables,
};

/** Dutch labels shown on the setup screen. */
export const TOPIC_LABELS: Record<Topic, string> = {
  tables: 'Tafels van 2 t/m 15 (zonder 10)',
};
