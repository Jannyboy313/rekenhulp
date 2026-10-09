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

/** A kladblok fraction; `den` is null while the cursor is still in the numerator. */
type NoteSegment =
  | { type: 'text'; text: string }
  | { type: 'fraction'; num: string; den: string | null };

// A kladblok fraction as stored (spec §3.6): '_3/4', or unfinished '_', '_3' and '_3/'.
const NOTE_FRACTION = /_(\d*)(?:\/(\d*))?/g;

/**
 * Like splitFractions, for a formatted kladblok note (spec §3.6). The whole part of a mixed
 * number (`1_2/3`) is the end of the text run before the fraction; after a space, a fraction is
 * its own item.
 */
export function splitNoteFractions(text: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(NOTE_FRACTION)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
    const [found, num = '', den = null] = match;
    segments.push({ type: 'fraction', num, den });
    last = index + found.length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
