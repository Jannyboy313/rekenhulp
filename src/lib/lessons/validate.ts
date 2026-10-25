import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { equals, type Rational } from '../rational';
import { PRACTICE_SETS } from '../sets';
import type { Lesson, LessonBlock } from './types';

// The tokenizer knows neither fractions nor grouped digits: '3/4' becomes '(3 : 4)' and the thin
// space of '2 500' is dropped. A mixed number ('1 1/2') stays unparsable and fails the chain.
function sideValue(side: string): Rational | null {
  const plain = side.replace(/(\d)\u{202f}(?=\d)/gu, '$1').replace(/(\d+)\/(\d+)/g, '($1 : $2)');
  const expr = parse(plain);
  return expr && evaluate(expr);
}

/** True when every side of `a = b = c` has a value and all values are equal (lesstof spec §6). */
export function chainHolds(line: string): boolean {
  const values = line.split(' = ').map(sideValue);
  const [first] = values;
  if (values.length < 2 || !first) return false;
  return values.every((value) => value !== null && equals(value, first));
}

/** Structure problems as readable messages; empty when all lessons are well-formed. */
export function lessonProblems(lessons: readonly Lesson[]): string[] {
  const setIds = new Set(PRACTICE_SETS.map((set) => set.id));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const { setId, topics } of lessons) {
    if (!setIds.has(setId)) problems.push(`${setId}: no practice set with this id`);
    if (seen.has(setId)) problems.push(`${setId}: more than one lesson`);
    seen.add(setId);
    if (topics.length === 0) problems.push(`${setId}: no topics`);
    const topicIds = new Set<string>();
    for (const topic of topics) {
      if (topicIds.has(topic.id)) problems.push(`${setId}/${topic.id}: duplicate topic id`);
      topicIds.add(topic.id);
      if (topic.blocks.length === 0) problems.push(`${setId}/${topic.id}: no blocks`);
    }
  }
  return problems;
}

// '*', 'x' between numbers and a spaced '/' are not Dutch notation (spec §8); 'km/u' and '3/4' are.
const ASCII_OPERATOR = /\*|\d\s*x\s*\d|\s\/\s/u;

function blockTexts(block: LessonBlock): string[] {
  switch (block.type) {
    case 'text':
    case 'tip':
      return [block.text];
    case 'worked':
      return [...(block.title === undefined ? [] : [block.title]), ...block.lines];
    case 'table':
      return [...block.head, ...block.rows.flat()];
  }
}

/** Notation problems and wrong worked examples, as readable messages. */
export function textProblems(lesson: Lesson): string[] {
  const problems: string[] = [];
  for (const topic of lesson.topics) {
    const where = `${lesson.setId}/${topic.id}`;
    for (const text of [topic.title, topic.summary, ...topic.blocks.flatMap(blockTexts)]) {
      if (ASCII_OPERATOR.test(text)) problems.push(`${where}: ASCII operator in "${text}"`);
    }
    for (const block of topic.blocks) {
      if (block.type !== 'worked') continue;
      for (const line of block.lines) {
        if (line.includes('?')) problems.push(`${where}: "?" in "${line}"`);
        else if (line.includes('-')) problems.push(`${where}: "-" in "${line}", use "−"`);
        else if (!chainHolds(line)) problems.push(`${where}: "${line}" does not hold`);
      }
    }
  }
  return problems;
}
