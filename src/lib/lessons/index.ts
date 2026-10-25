import type { PracticeSet } from '../types';
import { NUMBERS_LESSON } from './getallen';
import { MEASUREMENT_LESSON } from './meten';
import type { Lesson } from './types';
import { PROPORTIONS_LESSON } from './verhoudingen';

/** One lesson per practice set, added set by set (lesstof spec §2). */
export const LESSONS: readonly Lesson[] = [NUMBERS_LESSON, MEASUREMENT_LESSON, PROPORTIONS_LESSON];

export function lessonFor(set: PracticeSet, lessons = LESSONS): Lesson | undefined {
  return lessons.find((lesson) => lesson.setId === set.id);
}
