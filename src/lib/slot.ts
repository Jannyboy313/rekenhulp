/**
 * Marks the unknown of a prompt (`7 × SLOT = 56`). A private-use code point: it never occurs in
 * real text and counts as one character. A literal `?` is always a question mark (spec §8).
 */
export const SLOT = '\u{E000}';

export function hasSlot(prompt: string): boolean {
  return prompt.includes(SLOT);
}

/** The prompt as readable text: the slot becomes `?`. For tests and keys, never for display. */
export function plain(prompt: string): string {
  return prompt.replaceAll(SLOT, '?');
}
