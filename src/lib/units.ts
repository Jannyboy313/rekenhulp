/** The suffixes written against the number, as in the prompts: `25%`, `3‰`, `60°`. */
const STICKING: ReadonlySet<string> = new Set(['%', '‰', '°']);

/** Whether a suffix follows the number without a space; any other one gets a space (`5 °C`). */
export function sticks(suffix: string): boolean {
  return STICKING.has(suffix);
}

/**
 * An answer with its unit as written out: `€ 45`, `126 cm²`, `25%`. A percent, permille or
 * degree sign sticks to the number; any other prefix or suffix is separated by a space.
 */
export function withUnits(text: string, prefix?: string, suffix?: string): string {
  const before = prefix ? `${prefix} ` : '';
  const after = suffix ? (sticks(suffix) ? suffix : ` ${suffix}`) : '';
  return `${before}${text}${after}`;
}
