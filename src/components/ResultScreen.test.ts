// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { summarize, summarizeTest, type QuestionRecord } from '../lib/results';
import { fromInteger } from '../lib/rational';
import { SLOT } from '../lib/slot';
import { choiceStep, factorizationStep, numberStep } from '../lib/steps';
import type { Question, Step, Topic } from '../lib/types';
import { viewport } from './layout.svelte';
import ResultScreen from './ResultScreen.svelte';

function recordOf(
  step: Step,
  input: string,
  durationMs = 3000,
  topic: Topic = 'tables',
): QuestionRecord {
  const question: Question = { key: step.prompt, topic, steps: [step] };
  return { question, attempts: [{ input, result: step.check(input) }], durationMs };
}

function renderResults(
  records: QuestionRecord[],
  { totalMs = 10_000, onrestart = vi.fn(), onmenu = vi.fn(), onpractise = vi.fn() } = {},
) {
  return render(ResultScreen, {
    props: {
      name: 'Tafels',
      summary: summarize(records, totalMs),
      onrestart,
      onmenu,
      onpractise,
    },
  });
}

const LIMIT = 17 * 60_000;

/** A test of 15 with `right` correct and `wrong` wrong answers; the rest unanswered. */
function renderTest(right: number, wrong: number, { totalMs = 600_000, timedOut = false } = {}) {
  const records = Array.from({ length: right + wrong }, (_, i) =>
    recordOf(
      numberStep({ prompt: `${i} + 1 = ?`, answer: fromInteger(i + 1) }),
      i < right ? String(i + 1) : '99',
    ),
  );
  return render(ResultScreen, {
    props: {
      name: 'Oefentoets',
      summary: summarizeTest(records, 15, LIMIT, totalMs, timedOut),
      onrestart: vi.fn(),
      onmenu: vi.fn(),
      onpractise: vi.fn(),
    },
  });
}

const stat = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

function tileValues(card: Element): string[] {
  return [...card.querySelectorAll('.tile-value')].map((el) => el.textContent?.trim() ?? '');
}

const product = numberStep({ prompt: '7 × 8 = ?', answer: fromInteger(56) });

describe('ResultScreen', () => {
  it('shows the score, the percentage and a progressbar with the percentage', () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      recordOf(
        numberStep({ prompt: `${i} + 1 = ?`, answer: fromInteger(i + 1) }),
        i < 12 ? String(i + 1) : '99',
      ),
    );
    renderResults(records);
    expect(document.querySelector('.score')?.textContent?.trim()).toBe('12 / 15');
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('80');
    expect(screen.getByText('Resultaat')).toBeTruthy();
    expect(screen.getByText('Tafels')).toBeTruthy();
  });

  it('shows the score per topic, weakest first, between the score card and the mistakes', () => {
    renderResults([
      recordOf(product, '56', 3000, 'lcm'),
      recordOf(product, '54', 3000, 'scale'),
      recordOf(product, '56', 3000, 'scale'),
    ]);
    const heading = screen.getByRole('heading', { name: 'Per onderwerp' });
    const rows = [...document.querySelectorAll('.topic-row')].map((row) =>
      [...row.children].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ['Schaal', '1 / 2'],
      ['KGV', '1 / 1'],
    ]);
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    const mistakes = screen.getByRole('heading', { name: 'Fouten · 1' });
    expect(document.querySelector('.score-card')!.compareDocumentPosition(heading)).toBe(following);
    expect(heading.compareDocumentPosition(mistakes)).toBe(following);
  });

  it('collapses the score per topic by default and expands it on the heading', async () => {
    renderResults([recordOf(product, '56', 3000, 'lcm'), recordOf(product, '56', 3000, 'scale')]);
    const details = document.querySelector('details.topic-details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    // One card with the rows inside it (v4 spec §9).
    expect(details.classList.contains('card')).toBe(true);
    expect(details.querySelectorAll('.topic-row')).toHaveLength(2);
    await fireEvent.click(details.querySelector('summary')!);
    expect(details.open).toBe(true);
  });

  it('hides the score per topic with a single topic', () => {
    renderResults([recordOf(product, '56'), recordOf(product, '54')]);
    expect(screen.queryByRole('heading', { name: 'Per onderwerp' })).toBeNull();
  });

  it('formats the total time and the average over first attempts as m:ss and seconds', () => {
    renderResults([recordOf(product, '56', 2000), recordOf(product, '56', 4000)], {
      totalMs: 65_000,
    });
    expect(screen.getByText('Totale tijd').nextElementSibling?.textContent).toBe('1:05');
    expect(screen.getByText('Gemiddeld per som').nextElementSibling?.textContent).toBe('3,0 s');
  });

  it('shows a wrong multiple-choice answer with both option texts', () => {
    const estimate = choiceStep({
      prompt: 'Welk antwoord ligt het dichtst bij 49 × 81?',
      options: ['40', '400', '4000', '40 000'],
      answer: '4000',
    });
    renderResults([recordOf(estimate, '400')]);
    expect(tileValues(document.querySelector('.error-card')!)).toEqual(['400', '4000']);
  });

  it('lists the wrong steps under "Fouten · n", one card each with two tiles', () => {
    const second = numberStep({ prompt: '6 × 6 = ?', answer: fromInteger(36) });
    renderResults([recordOf(product, '54'), recordOf(second, '30'), recordOf(product, '56')]);
    expect(screen.getByRole('heading', { name: 'Fouten · 2' })).toBeTruthy();
    const cards = [...document.querySelectorAll('.error-card')];
    expect(cards).toHaveLength(2);
    expect(tileValues(cards[0]!)).toEqual(['54', '56']);
    expect(tileValues(cards[1]!)).toEqual(['30', '36']);
    for (const card of cards) {
      expect(card.textContent).toContain('Jouw antwoord');
      expect(card.textContent).toContain('Goed antwoord');
    }
  });

  it('has no "jij:" line and no strike-through', () => {
    renderResults([recordOf(product, '54')]);
    expect(document.body.textContent).not.toContain('jij:');
    expect(document.querySelector('del, s, [style*="line-through"]')).toBeNull();
  });

  it('puts the unit of the step on both tiles', () => {
    const area = numberStep({
      prompt: 'Hoe groot is de oppervlakte?',
      answer: fromInteger(126),
      suffix: 'cm²',
    });
    renderResults([recordOf(area, '402')]);
    expect(tileValues(document.querySelector('.error-card')!)).toEqual(['402 cm²', '126 cm²']);
  });

  it('puts a prefix before both tiles', () => {
    const price = numberStep({ prompt: `Prijs = ${SLOT}`, answer: fromInteger(45), prefix: '€' });
    renderResults([recordOf(price, '15')]);
    expect(tileValues(document.querySelector('.error-card')!)).toEqual(['€ 15', '€ 45']);
  });

  it('shows the unknown of a sum as an uncoloured ?', () => {
    const missing = numberStep({ prompt: `7 × ${SLOT} = 56`, answer: fromInteger(8) });
    renderResults([recordOf(missing, '9')]);
    const prompt = document.querySelector('.error-card .prompt')!;
    expect(prompt.textContent).toBe('7 × ? = 56');
    const slot = prompt.querySelector('.slot')!;
    for (const tone of ['primary', 'good', 'bad'])
      expect(slot.classList.contains(`tone-${tone}`)).toBe(false);
  });

  it('keeps a step that was wrong on the first attempt in the list', () => {
    // Only first attempts are recorded: the right repeat never replaces the wrong record.
    renderResults([recordOf(product, '54')]);
    expect(document.querySelectorAll('.error-card')).toHaveLength(1);
  });

  it('lists a wrong factorization pretty-printed with its tip and explanation', () => {
    const step = factorizationStep({
      prompt: 'Ontbind 84 in priemfactoren',
      value: 84,
      explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    });
    renderResults([recordOf(step, '2^2×21', 5000)]);
    expect(screen.getByText('Ontbind 84 in priemfactoren')).toBeTruthy();
    expect(tileValues(document.querySelector('.error-card')!)).toEqual(['2² × 21', '2² × 3 × 7']);
    expect(document.querySelector('.tip .note-body')?.textContent).toBe(
      '21 is geen priemgetal: ontbind het verder.',
    );
    expect(document.querySelector('.explanation .note-body')?.textContent).toBe(
      '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    );
  });

  it('labels a tip "Tip" and an explanation "Uitleg", only when present', () => {
    renderResults([recordOf(product, '560')]);
    expect(screen.getByText('Tip')).toBeTruthy();
    expect(document.querySelector('.tip .note-body')?.textContent).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(screen.queryByText('Uitleg')).toBeNull();

    renderResults([recordOf(product, '54')]);
    expect(screen.getAllByText('Tip')).toHaveLength(1);
  });

  it('says all is well without mistakes, with no list', () => {
    renderResults([recordOf(product, '56')]);
    expect(screen.getByText('Alles goed!')).toBeTruthy();
    expect(screen.queryByText(/Fouten/)).toBeNull();
    expect(document.querySelector('.error-card')).toBeNull();
  });

  it('shows no score card when nothing was answered', () => {
    renderResults([]);
    expect(screen.getByText('Geen opgaven beantwoord.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('names the Menu button after where it leads', () => {
    render(ResultScreen, {
      props: {
        name: 'KGV',
        summary: summarize([], 0),
        onrestart: vi.fn(),
        onmenu: vi.fn(),
        menuLabel: 'Naar de les',
        onpractise: vi.fn(),
      },
    });
    expect(screen.getByRole('button', { name: 'Naar de les' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it('calls Menu and Opnieuw once each', async () => {
    const onmenu = vi.fn();
    const onrestart = vi.fn();
    renderResults([recordOf(product, '56')], { onmenu, onrestart });
    await fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw' }));
    expect(onmenu).toHaveBeenCalledOnce();
    expect(onrestart).toHaveBeenCalledOnce();
  });

  it('offers no Fouten oefenen without mistakes, with Opnieuw as the primary button', () => {
    renderResults([recordOf(product, '56')]);
    expect(screen.queryByRole('button', { name: /Fouten oefenen/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Opnieuw' }).classList).toContain('primary');
  });

  it('offers a tonal Fouten oefenen with three exercises per wrong question, Opnieuw primary', async () => {
    const second = numberStep({ prompt: '6 × 6 = ?', answer: fromInteger(36) });
    // Two wrong steps of one question count as one mistake.
    const twoSteps: QuestionRecord = {
      question: { key: 'two', topic: 'tables', steps: [product, second] },
      attempts: [
        { input: '1', result: product.check('1') },
        { input: '1', result: second.check('1') },
      ],
      durationMs: 3000,
    };
    const onpractise = vi.fn();
    renderResults([recordOf(product, '54'), twoSteps, recordOf(second, '36')], { onpractise });
    await fireEvent.click(screen.getByRole('button', { name: 'Fouten oefenen · 6' }));
    expect(onpractise).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Opnieuw' }).classList).toContain('primary');
    expect(screen.getByRole('button', { name: 'Fouten oefenen · 6' }).classList).toContain('tonal');
  });
});

describe('ResultScreen "Per onderwerp" per layout (v4 spec §8)', () => {
  afterEach(() => {
    viewport.shown = 'phone';
  });

  const twoTopics = () => [
    recordOf(product, '56', 3000, 'lcm'),
    recordOf(product, '56', 3000, 'scale'),
  ];
  const details = () => document.querySelector('details.topic-details') as HTMLDetailsElement;

  it('starts open when the screen mounts in a landscape layout', () => {
    viewport.shown = 'tablet-landscape';
    renderResults(twoTopics());
    expect(details().open).toBe(true);
  });

  it('starts closed on a portrait tablet', () => {
    viewport.shown = 'tablet-portrait';
    renderResults(twoTopics());
    expect(details().open).toBe(false);
  });

  it('keeps the choice of the user through a rotation, both ways', async () => {
    renderResults(twoTopics());
    await fireEvent.click(details().querySelector('summary')!);
    viewport.shown = 'tablet-landscape';
    await tick();
    expect(details().open).toBe(true);

    await fireEvent.click(details().querySelector('summary')!);
    viewport.shown = 'phone';
    await tick();
    expect(details().open).toBe(false);
  });
});

describe('ResultScreen after an Oefentoets (test spec §6)', () => {
  it('shows a pass with the needed number and the score over the whole test', () => {
    renderTest(11, 1);
    expect(screen.getByText('Oefentoets')).toBeTruthy();
    expect(screen.getByText('Geslaagd')).toBeTruthy();
    expect(
      screen.getByText(
        'Je had 11 van de 15 goed nodig (70%). Dit is een indicatie, geen Cito-norm.',
      ),
    ).toBeTruthy();
    expect(document.querySelector('.score')?.textContent?.trim()).toBe('11 / 15');
    expect(screen.getByText('73%')).toBeTruthy();
    expect(stat('Tijd')).toBe('10:00 van 17:00');
    expect(stat('Niet beantwoord')).toBe('3');
  });

  it('shows a fail', () => {
    renderTest(10, 5);
    expect(screen.getByText('Niet geslaagd')).toBeTruthy();
    expect(screen.queryByText('Geslaagd')).toBeNull();
    expect(screen.queryByText('Niet beantwoord')).toBeNull();
  });

  it('says when the time ran out', () => {
    renderTest(3, 0, { totalMs: LIMIT + 400, timedOut: true });
    expect(screen.getByText('De tijd was om.')).toBeTruthy();
    expect(stat('Tijd')).toBe('17:00 van 17:00');
  });

  it('shows the verdict and the score also without answers', () => {
    renderTest(0, 0, { timedOut: true });
    expect(screen.getByText('Niet geslaagd')).toBeTruthy();
    expect(document.querySelector('.score')?.textContent?.trim()).toBe('0 / 15');
    expect(screen.queryByText('Geen opgaven beantwoord.')).toBeNull();
    expect(screen.queryByText('Alles goed!')).toBeNull();
  });

  it('says Alles goed! only when every exercise of the test was right', () => {
    renderTest(12, 0);
    expect(screen.queryByText('Alles goed!')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Fouten/ })).toBeNull();
  });

  it('says Alles goed! after a test without mistakes or gaps', () => {
    renderTest(15, 0);
    expect(screen.getByText('Alles goed!')).toBeTruthy();
  });
});
