/**
 * An answer with its unit as written out: `€ 45`, `126 cm²`, `25%`. A percent sign sticks to the
 * number; any other prefix or suffix is separated by a space.
 */
export function withUnits(text: string, prefix?: string, suffix?: string): string {
  const before = prefix ? `${prefix} ` : '';
  const after = suffix ? (suffix === '%' ? suffix : ` ${suffix}`) : '';
  return `${before}${text}${after}`;
}
