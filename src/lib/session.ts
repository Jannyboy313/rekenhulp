import { randomInt, shuffle, type Rng } from './random';
import { GENERATORS } from './topics';
import type { Generator, PracticeSet, Question, Topic } from './types';

export const MAX_UNIQUE_ATTEMPTS = 20;

export interface Weighted<K> {
  key: K;
  weight: number;
}

/** Number of table exercises; the share is an integer percentage to avoid float artefacts. */
export function tablesCount(tablesPercent: number, size: number): number {
  return Math.round((tablesPercent * size) / 100);
}

/**
 * Largest remainder method with random tie-breaks (spec §4.2). When the total allows it, every
 * key gets at least one; a key that ended at 0 takes one from the largest quota.
 */
export function allocateQuotas<K>(
  items: readonly Weighted<K>[],
  total: number,
  rng: Rng,
): Map<K, number> {
  if (total > 0 && items.length === 0) {
    throw new RangeError('Cannot allocate exercises without topics');
  }
  if (items.some((item) => !(item.weight > 0))) {
    throw new RangeError('Topic weights must be positive');
  }

  const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
  const shares = items.map((item) => {
    const exact = (total * item.weight) / weightSum;
    const count = Math.floor(exact);
    // Rounded so float noise (0.2000000001 vs 0.2) does not decide ties.
    const remainder = Math.round((exact - count) * 1e9);
    return { key: item.key, count, remainder, tieBreak: rng() };
  });

  let leftover = total - shares.reduce((sum, share) => sum + share.count, 0);
  const byRemainder = [...shares].sort(
    (x, y) => y.remainder - x.remainder || y.tieBreak - x.tieBreak,
  );
  for (const share of byRemainder) {
    if (leftover === 0) break;
    share.count++;
    leftover--;
  }

  if (total >= shares.length) {
    for (const share of shares) {
      if (share.count > 0) continue;
      const donor = shares.reduce((max, candidate) => (candidate.count > max.count ? candidate : max));
      donor.count--;
      share.count++;
    }
  }

  return new Map(shares.map((share) => [share.key, share.count]));
}

export function buildSession(
  set: PracticeSet,
  size: number,
  rng: Rng,
  generators: Record<Topic, Generator> = GENERATORS,
): Question[] {
  const tables = tablesCount(set.tablesPercent, size);
  const quotas = allocateQuotas(
    set.topics.map(({ topic, weight }) => ({ key: topic, weight })),
    size - tables,
    rng,
  );

  const plan: Topic[] = Array.from({ length: tables }, (): Topic => 'tables');
  for (const [topic, count] of quotas) {
    for (let i = 0; i < count; i++) plan.push(topic);
  }

  const usedKeys = new Set<string>();
  const questions = plan.map((topic) => generateUnique(generators[topic], rng, usedKeys));
  return shuffle(rng, questions);
}

function generateUnique(generate: Generator, rng: Rng, usedKeys: Set<string>): Question {
  let question = generate(rng);
  for (let attempt = 1; attempt < MAX_UNIQUE_ATTEMPTS && usedKeys.has(question.key); attempt++) {
    question = generate(rng);
  }
  usedKeys.add(question.key);
  return question;
}

/**
 * Puts a wrongly answered question back into the queue (spec §3.4): at a random place after the
 * current one, but not directly next unless nothing else remains. Returns a new array.
 */
export function insertRepeat<T>(queue: readonly T[], currentIndex: number, item: T, rng: Rng): T[] {
  const earliest = Math.min(currentIndex + 2, queue.length);
  const index = randomInt(rng, earliest, queue.length);
  return [...queue.slice(0, index), item, ...queue.slice(index)];
}
