export type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'fraction'; num: string; den: string };

// 'a/b', where the digits may be grouped with thin spaces, or the ½ glyph of 12½% (spec §8).
const FRACTION = /(\d[\d\u{202f}]*)\/(\d[\d\u{202f}]*)|½/gu;

/** Splits text into plain runs and fractions, so the UI can draw the fractions stacked. */
export function splitFractions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FRACTION)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
    // The ½ glyph has no capture groups.
    const [found, num = '1', den = '2'] = match;
    segments.push({ type: 'fraction', num, den });
    last = index + found.length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
