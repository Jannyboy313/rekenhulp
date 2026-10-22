type TextSegment =
  | { type: 'text'; text: string }
  /** Mixed: the fraction belongs to the whole number before it, as in `−12 1/2`. */
  | { type: 'fraction'; num: string; den: string; mixed: boolean };

// 'a/b', where the digits may be grouped with thin spaces (spec §8).
// A '?' can take the place of either term: '3/4 = ?/12'.
const FRACTION = /(\d[\d\u{202f}]*|\?)\/(\d[\d\u{202f}]*|\?)/gu;

// The whole part of a mixed number, followed by the one space of '12 1/2'.
const WHOLE_PART_END = /\d $/u;

/** Splits text into plain runs and fractions, so the UI can draw the fractions stacked. */
export function splitFractions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FRACTION)) {
    const index = match.index ?? 0;
    let before = text.slice(last, index);
    const mixed = WHOLE_PART_END.test(before);
    // Drop the space of '12 1/2': the whole part stands right next to the stacked fraction.
    if (mixed) before = before.slice(0, -1);
    if (before !== '') segments.push({ type: 'text', text: before });
    const [found, num = '', den = ''] = match;
    segments.push({ type: 'fraction', num, den, mixed });
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
