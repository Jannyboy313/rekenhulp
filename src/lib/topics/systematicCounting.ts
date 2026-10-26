import { formatInteger as f } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Systematic counting (spec §5.41).
export type CombinationContext = 'kleding' | 'menu';
export type HandshakeContext = 'handen' | 'competitie';
export type OrderingContext = 'rij' | 'podium';

const HEURISTIC = 'Systematisch tellen:';

function question(
  key: string,
  prompt: string,
  answer: number,
  explanation: string,
  diagnose?: Diagnose,
): Question {
  return {
    key: `systematicCounting:${key}`,
    topic: 'systematicCounting',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(answer),
        explanation: `${HEURISTIC} ${explanation}`,
        diagnose,
      }),
    ],
  };
}

const product = (values: readonly number[]) => values.reduce((a, b) => a * b, 1);
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/** kleding: two counts (broeken, truien); menu: three (voor-, hoofd-, nagerechten). */
export function combinationsQuestion(
  context: CombinationContext,
  counts: readonly number[],
): Question {
  const answer = product(counts);
  const factors = counts.join(' × ');
  const [a, b, c] = counts as [number, number, number];
  const kleding = context === 'kleding';
  return question(
    `combinations:${context}:${counts.join(':')}`,
    kleding
      ? `Je hebt ${a} broeken en ${b} truien. Hoeveel verschillende combinaties van een broek en een trui kun je maken?`
      : `Een restaurant heeft ${a} voorgerechten, ${b} hoofdgerechten en ${c} nagerechten. Hoeveel verschillende menu's van drie gangen kun je kiezen?`,
    answer,
    kleding
      ? `bij elke broek passen ${b} truien → ${factors} = ${f(answer)}`
      : `elk voorgerecht met elk hoofdgerecht en elk nagerecht → ${factors} = ${f(answer)}`,
    exactTip(
      fromInteger(sum(counts)),
      kleding
        ? `Bij elke broek passen ${b} truien: vermenigvuldig, ${factors}.`
        : `Elk voorgerecht past bij elk hoofdgerecht en elk nagerecht: vermenigvuldig, ${factors}.`,
    ),
  );
}

const HANDSHAKES = {
  handen: {
    prompt: (n: number) =>
      `Op een feest geeft elke gast elke andere gast één keer een hand. Er zijn ${n} gasten. Hoeveel handdrukken zijn dat?`,
    each: (n: number) => `elk van de ${n} gasten geeft ${n - 1} handen`,
    noun: 'handdruk',
  },
  competitie: {
    prompt: (n: number) =>
      `In een competitie speelt elk team één keer tegen elk ander team. Er doen ${n} teams mee. Hoeveel wedstrijden zijn dat?`,
    each: (n: number) => `elk van de ${n} teams speelt ${n - 1} wedstrijden`,
    noun: 'wedstrijd',
  },
} as const;

export function handshakesQuestion(context: HandshakeContext, n: number): Question {
  const { prompt, each, noun } = HANDSHAKES[context];
  const twice = n * (n - 1);
  const answer = twice / 2;
  return question(
    `handshakes:${context}:${n}`,
    prompt(n),
    answer,
    `${each(n)} → ${n} × ${n - 1} = ${f(twice)} → zo telt elke ${noun} dubbel: ${f(twice)} : 2 = ${f(answer)}`,
    exactTip(fromInteger(twice), `Zo tel je elke ${noun} twee keer: deel nog door 2.`),
  );
}

export function orderingsQuestion(context: OrderingContext, n: number): Question {
  if (context === 'rij') {
    const factors = Array.from({ length: n }, (_, i) => n - i);
    const answer = product(factors);
    return question(
      `orderings:rij:${n}`,
      `Op hoeveel manieren kunnen ${n} kinderen naast elkaar in een rij staan?`,
      answer,
      `${n} kinderen kunnen vooraan staan, dan ${n - 1} op de 2e plek, … → ${factors.join(' × ')} = ${f(answer)}`,
    );
  }
  const answer = n * (n - 1) * (n - 2);
  return question(
    `orderings:podium:${n}`,
    `Aan een hardloopwedstrijd doen ${n} kinderen mee. Op hoeveel manieren kunnen de 1e, 2e en 3e plaats verdeeld worden?`,
    answer,
    `${n} kinderen voor de 1e plaats, ${n - 1} voor de 2e, ${n - 2} voor de 3e → ${n} × ${n - 1} × ${n - 2} = ${f(answer)}`,
  );
}

function drawCombinations(rng: Rng): Question {
  if (rng() < 0.5) {
    return combinationsQuestion('kleding', [randomInt(rng, 2, 8), randomInt(rng, 2, 8)]);
  }
  const counts = drawUntil(() => {
    const counts = [randomInt(rng, 2, 6), randomInt(rng, 2, 6), randomInt(rng, 2, 6)];
    return product(counts) <= 120 ? counts : null;
  });
  return combinationsQuestion('menu', counts);
}

/** Combinations, handshakes and orderings, each 1/3; two contexts per form, each 1/2. */
export function generateSystematicCounting(rng: Rng): Question {
  switch (pick(rng, ['combinations', 'handshakes', 'orderings'] as const)) {
    case 'combinations':
      return drawCombinations(rng);
    case 'handshakes':
      return handshakesQuestion(rng() < 0.5 ? 'handen' : 'competitie', randomInt(rng, 4, 16));
    case 'orderings':
      return rng() < 0.5
        ? orderingsQuestion('rij', randomInt(rng, 3, 5))
        : orderingsQuestion('podium', randomInt(rng, 4, 8));
  }
}
