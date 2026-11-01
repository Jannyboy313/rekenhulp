import { gcd } from '../primes';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import { choiceStep } from '../steps';
import type { Question } from '../types';

interface Concept {
  term: string;
  definition: string;
  /** The term with its article, for `Wat is …?`. */
  subject: string;
  plural: boolean;
  explanation: string;
}

/** Spec §5.75: the fixed list of terms and definitions. */
export const CONCEPTS: readonly Concept[] = [
  {
    term: 'teller',
    definition: 'het getal boven de breukstreep',
    subject: 'de teller',
    plural: false,
    explanation: 'De teller is het getal boven de breukstreep, zoals de 3 in 3/4.',
  },
  {
    term: 'noemer',
    definition: 'het getal onder de breukstreep',
    subject: 'de noemer',
    plural: false,
    explanation: 'De noemer is het getal onder de breukstreep, zoals de 4 in 3/4.',
  },
  {
    term: 'stambreuk',
    definition: 'een breuk met teller 1',
    subject: 'een stambreuk',
    plural: false,
    explanation: 'Een stambreuk is een breuk met teller 1, zoals 1/5.',
  },
  {
    term: 'onechte breuk',
    definition: 'een breuk met een teller groter dan de noemer',
    subject: 'een onechte breuk',
    plural: false,
    explanation: 'Een onechte breuk is een breuk met een teller groter dan de noemer, zoals 7/4.',
  },
  {
    term: 'gemengd getal',
    definition: 'een heel getal en een breuk samen',
    subject: 'een gemengd getal',
    plural: false,
    explanation: 'Een gemengd getal is een heel getal en een breuk samen, zoals 1 3/4.',
  },
  {
    term: 'samengestelde breuk',
    definition: 'een breuk met een breuk in de teller of de noemer',
    subject: 'een samengestelde breuk',
    plural: false,
    explanation: 'Een samengestelde breuk is een breuk met een breuk in de teller of de noemer.',
  },
  {
    term: 'gelijknamige breuken',
    definition: 'breuken met dezelfde noemer',
    subject: 'gelijknamige breuken',
    plural: true,
    explanation: 'Gelijknamige breuken hebben dezelfde noemer, zoals 2/7 en 5/7.',
  },
  {
    term: 'gelijkwaardige breuken',
    definition: 'breuken met dezelfde waarde',
    subject: 'gelijkwaardige breuken',
    plural: true,
    explanation: 'Gelijkwaardige breuken hebben dezelfde waarde, zoals 1/2 en 2/4.',
  },
];

export type Direction = 'definition' | 'term';

/** `Wat is een stambreuk?` (definitions as options) or `Hoe heet een breuk met teller 1?` (terms). */
export function conceptQuestion(index: number, direction: Direction, rng: Rng): Question {
  const concept = CONCEPTS[index]!;
  const others = shuffle(
    rng,
    CONCEPTS.filter((_, other) => other !== index),
  ).slice(0, 3);
  const text = (item: Concept) => (direction === 'definition' ? item.definition : item.term);
  const verb = concept.plural ? ['zijn', 'heten'] : ['is', 'heet'];
  const prompt =
    direction === 'definition'
      ? `Wat ${verb[0]} ${concept.subject}?`
      : `Hoe ${verb[1]} ${concept.definition}?`;
  return {
    key: `fractionConcepts:concept:${direction}:${concept.term}`,
    topic: 'fractionConcepts',
    steps: [
      choiceStep({
        prompt,
        options: shuffle(rng, [concept, ...others]).map(text),
        answer: text(concept),
        explanation: concept.explanation,
      }),
    ],
  };
}

/** `Welke breuk is gelijkwaardig aan 3/4?` for `p/q` in lowest terms and the factor `k`. */
export function equivalentQuestion(p: number, q: number, k: number, rng: Rng): Question {
  const answer = `${k * p}/${k * q}`;
  return {
    key: `fractionConcepts:equivalent:${p}/${q}:${k}`,
    topic: 'fractionConcepts',
    steps: [
      choiceStep({
        prompt: `Welke breuk is gelijkwaardig aan ${p}/${q}?`,
        options: shuffle(rng, [answer, `${p + k}/${q + k}`, `${q}/${p}`, `${p}/${q + 1}`]),
        answer,
        explanation: `${p}/${q} = ${answer} (teller en noemer × ${k})`,
      }),
    ],
  };
}

export function generateFractionConcepts(rng: Rng): Question {
  if (rng() < 0.5) {
    return conceptQuestion(
      randomInt(rng, 0, CONCEPTS.length - 1),
      pick(rng, ['definition', 'term'] as const),
      rng,
    );
  }
  const q = randomInt(rng, 3, 10);
  const p = drawUntil(() => {
    const candidate = randomInt(rng, 1, q - 1);
    return gcd(candidate, q) === 1 ? candidate : null;
  });
  return equivalentQuestion(p, q, randomInt(rng, 2, 5), rng);
}
