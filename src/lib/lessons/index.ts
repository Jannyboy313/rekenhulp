import type { PracticeSet } from '../types';
import type { Lesson } from './types';

/** One lesson per practice set, added set by set (lesstof spec §2). */
export const LESSONS: readonly Lesson[] = [];

export function lessonFor(set: PracticeSet, lessons = LESSONS): Lesson | undefined {
  return lessons.find((lesson) => lesson.setId === set.id);
}
