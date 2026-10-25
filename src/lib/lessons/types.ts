/** One piece of a lesson topic (lesstof spec §5). All text is rendered with MathText. */
export type LessonBlock =
  | { type: 'text'; text: string }
  /** A worked example: every line is an equality chain, checked in the tests. */
  | { type: 'worked'; title?: string; lines: readonly string[] }
  | { type: 'table'; head: readonly string[]; rows: readonly (readonly string[])[] }
  | { type: 'tip'; text: string };

export interface LessonTopic {
  id: string;
  /** Dutch title. */
  title: string;
  /** Dutch one-line summary for the topic list. */
  summary: string;
  blocks: readonly LessonBlock[];
}

/** The lesstof of one practice set; its topics are its own, not the set's practice topics. */
export interface Lesson {
  setId: string;
  topics: readonly LessonTopic[];
}
