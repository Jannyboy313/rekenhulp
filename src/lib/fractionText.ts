type TextSegment =
  | { type: 'text'; text: string }
  /** Mixed: the fraction belongs to the whole number before it, as in `12½` or `−12 1/2`. */
  | { type: 'fraction'; num: string; den: string; mixed: boolean };

// 'a/b', where the digits may be grouped with thin spaces, or the ½ glyph of 12½% (spec §8).
// A '?' can take the place of either term: '3/4 = ?/12'.
const FRACTION = /(\d[\d\u{202f}]*|\?)\/(\d[\d\u{202f}]*|\?)|½/gu;

// The whole part of a mixed number, optionally followed by the one space of '12 1/2'.
const WHOLE_PART_END = /\d( ?)$/u;

/** Splits text into plain runs and fractions, so the UI can draw the fractions stacked. */
export function splitFractions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FRACTION)) {
    const index = match.index ?? 0;
    let before = text.slice(last, index);
    const whole = WHOLE_PART_END.exec(before);
    // Drop the space of '12 1/2', so it looks the same as '12½'.
    if (whole?.[1]) before = before.slice(0, -1);
    if (before !== '') segments.push({ type: 'text', text: before });
    // The ½ glyph has no capture groups.
    const [found, num = '1', den = '2'] = match;
    segments.push({ type: 'fraction', num, den, mixed: whole !== null });
    last = index + found.length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}

// The breuk key of the kladblok: 'a/b', or 'a/' while the denominator is not typed yet.
const NOTE_FRACTION = /(\d+)\/(\d*)/g;

/**
 * Like splitFractions, for a formatted kladblok note (spec §3.6). A space separates items there,
 * so a fraction is never mixed: `12 3/4` is the items `12` and `3/4`. A fraction without
 * denominator yet has an empty `den`.
 */
export function splitNoteFractions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(NOTE_FRACTION)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
    const [found, num = '', den = ''] = match;
    segments.push({ type: 'fraction', num, den, mixed: false });
    last = index + found.length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
