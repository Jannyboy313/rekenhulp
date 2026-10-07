/** A source of uniformly distributed floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: a tiny, fast, seedable PRNG. Not cryptographically secure (not needed here). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** Uniform integer in [min, max], both inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError(`Invalid integer range [${min}, ${max}]`);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniform integer in [min, max] that passes `accept`, by rejection. Throws if none turns up. */
export function randomIntWhere(
  rng: Rng,
  min: number,
  max: number,
  accept: (value: number) => boolean,
): number {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const value = randomInt(rng, min, max);
    if (accept(value)) return value;
  }
  throw new RangeError(`No accepted integer found in [${min}, ${max}]`);
}

/**
 * The first non-null result of `draw`, by rejection: "redrawn until all rules hold". Throws if
 * none turns up.
 */
export function drawUntil<T>(draw: () => T | null): T {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const value = draw();
    if (value !== null) return value;
  }
  throw new RangeError('No accepted draw found');
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
  return items[Math.floor(rng() * items.length)]!;
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
