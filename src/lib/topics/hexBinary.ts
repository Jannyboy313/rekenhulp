import { drawUntil, randomInt, type Rng } from '../random';
import { textStep } from '../steps';
import type { Question } from '../types';
import { stripLeadingZeros } from './numberSystems';

// Binary and hexadecimal (spec §5.92). Values in [32, 255] have a binary numeral of 6 to 8 digits
// and a two-digit hex numeral, so both groups of four bits are always there.

const hexOf = (value: number) => value.toString(16).toUpperCase();
const binaryOf = (value: number) => value.toString(2);

/** `groepjes van 4 vanaf rechts: 1011 | 0111 → 1011 = 11 = B en 0111 = 7 → B7` */
function toHexExplanation(value: number): string {
  const hex = hexOf(value);
  const bits = binaryOf(value).padStart(8, '0');
  const groups = [bits.slice(0, 4), bits.slice(4)];
  const parts = groups.map((group, index) => {
    const digit = parseInt(group, 2);
    const char = hex[index]!;
    return /[A-F]/.test(char) ? `${group} = ${digit} = ${char}` : `${group} = ${digit}`;
  });
  return `groepjes van 4 vanaf rechts: ${groups.join(' | ')} → ${parts.join(' en ')} → ${hex}`;
}

/** `3 = 0011 en E = 14 = 1110 → 0011 1110 → 111110` */
function toBinaryExplanation(value: number): string {
  const hex = hexOf(value);
  const nibbles = [...hex].map((char) => parseInt(char, 16).toString(2).padStart(4, '0'));
  const parts = [...hex].map((char, index) => {
    const digit = parseInt(char, 16);
    return /[A-F]/.test(char)
      ? `${char} = ${digit} = ${nibbles[index]}`
      : `${char} = ${nibbles[index]}`;
  });
  return `${parts.join(' en ')} → ${nibbles.join(' ')} → ${binaryOf(value)}`;
}

export function generateHexBinary(rng: Rng): Question {
  const toHex = rng() < 0.5;
  const value = drawUntil(() => {
    const drawn = randomInt(rng, 32, 255);
    return /[A-F]/.test(hexOf(drawn)) ? drawn : null;
  });
  const step = toHex
    ? textStep({
        kind: 'baseDigits',
        prompt: `Schrijf het tweetallige getal ${binaryOf(value)} in het zestientallig stelsel.`,
        answer: hexOf(value),
        normalize: stripLeadingZeros,
        explanation: toHexExplanation(value),
      })
    : textStep({
        kind: 'baseDigits',
        prompt: `Schrijf het zestientallige getal ${hexOf(value)} in het tweetallig stelsel.`,
        answer: binaryOf(value),
        normalize: stripLeadingZeros,
        explanation: toBinaryExplanation(value),
      });
  return {
    key: `hexBinary:${toHex ? 'toHex' : 'toBinary'}:${value}`,
    topic: 'hexBinary',
    steps: [step],
  };
}
