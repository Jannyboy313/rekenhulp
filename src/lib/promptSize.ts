import { splitFractions } from './fractionText';

type PromptSize = 'large' | 'medium' | 'small';

// Checked on a phone on 2026-10-22 (spec §3.3).
const LARGE_MAX = 18;
const MEDIUM_MAX = 40;

/** The prompt's length as displayed: a stacked fraction is as wide as its widest line. */
export function displayLength(text: string): number {
  let length = 0;
  for (const segment of splitFractions(text)) {
    if (segment.type === 'slot') length += 1;
    else if (segment.type === 'text') length += [...segment.text].length;
    else length += Math.max(segment.num.length, segment.den.length);
  }
  return length;
}

/** Font size step for a prompt, so long prompts do not push the keypad down (spec §3.3). */
export function promptSize(text: string): PromptSize {
  const length = displayLength(text);
  if (length <= LARGE_MAX) return 'large';
  return length <= MEDIUM_MAX ? 'medium' : 'small';
}
