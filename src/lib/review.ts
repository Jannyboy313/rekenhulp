import type { PracticeRecord } from './memory';
import { GENERATORS } from './topics';
import type { Topic } from './types';

/** The row on the Oefenen tab (review spec §4): display data only, not a set. */
export const REVIEW_ROW = { id: 'fouten', name: 'Fouten van eerder' } as const;

export function reviewDescription(count: number): string {
  return `${count} ${count === 1 ? 'onderwerp' : 'onderwerpen'} om te herhalen`;
}

const TOPIC_IDS: ReadonlySet<string> = new Set(Object.keys(GENERATORS));

/** The local calendar day of a moment, comparable as a number. */
function dayOf(ms: number): number {
  const date = new Date(ms);
  return date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate();
}

/**
 * The topics that are due at `now`, the oldest mistake first (review spec §3). Per topic only
 * its last session counts (the records with its latest `at`): it is due when that session has
 * a mistake and was on an earlier day.
 */
export function dueTopics(
  records: readonly PracticeRecord[],
  now: number,
  known: ReadonlySet<string> = TOPIC_IDS,
): Topic[] {
  // A Map keeps the order of the first record of each topic.
  const last = new Map<string, { at: number; wrong: boolean }>();
  for (const { topic, correct, at } of records) {
    if (!known.has(topic)) continue;
    const session = last.get(topic);
    if (!session) last.set(topic, { at, wrong: !correct });
    else if (at > session.at) Object.assign(session, { at, wrong: !correct });
    else if (at === session.at && !correct) session.wrong = true;
  }
  const today = dayOf(now);
  return [...last]
    .filter(([, { at, wrong }]) => wrong && dayOf(at) < today)
    .sort(([, a], [, b]) => a.at - b.at)
    .map(([topic]) => topic as Topic);
}
