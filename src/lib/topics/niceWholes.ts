/** Integers in [min, max] with at most 2 significant digits, ascending: 85, 470 and 9000. */
export function niceWholesBetween(min: number, max: number): number[] {
  const wholes = new Set<number>();
  for (let digits = 1; digits <= 99; digits++) {
    for (let value = digits; value <= max; value *= 10) {
      if (value >= min) wholes.add(value);
    }
  }
  return [...wholes].sort((a, b) => a - b);
}
