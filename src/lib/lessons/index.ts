import type { PracticeSet } from '../types';
import { OPERATIONS_LESSON } from './bewerkingen';
import { FRACTIONS_LESSON } from './breuken';
import { NUMBER_SENSE_LESSON } from './getalbegrip';
import { NUMBERS_LESSON } from './getallen';
import { HEURISTICS_LESSON } from './heuristieken';
import { GEOMETRY_LESSON } from './meetkunde';
import { MEASUREMENT_LESSON } from './meten';
import { NUMBER_SYSTEMS_LESSON } from './talstelsels';
import type { Lesson } from './types';
import { RELATIONS_LESSON } from './verbanden';
import { PROPORTIONS_LESSON } from './verhoudingen';

/** One lesson per practice set, added set by set (lesstof spec §2). */
export const LESSONS: readonly Lesson[] = [
  NUMBERS_LESSON,
  MEASUREMENT_LESSON,
  PROPORTIONS_LESSON,
  OPERATIONS_LESSON,
  NUMBER_SENSE_LESSON,
  FRACTIONS_LESSON,
  GEOMETRY_LESSON,
  RELATIONS_LESSON,
  NUMBER_SYSTEMS_LESSON,
  HEURISTICS_LESSON,
];

export function lessonFor(set: PracticeSet, lessons = LESSONS): Lesson | undefined {
  return lessons.find((lesson) => lesson.setId === set.id);
}
