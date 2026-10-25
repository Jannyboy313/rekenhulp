// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { summarize, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { fromInteger } from '../lib/rational';
import { SLOT } from '../lib/slot';
import { factorizationStep, numberStep } from '../lib/steps';
import type { Question, Step } from '../lib/types';
import ResultScreen from './ResultScreen.svelte';

function recordOf(step: Step, input: string, durationMs = 3000): QuestionRecord {
  const question: Question = { key: step.prompt, topic: 'tables', steps: [step] };
  return { question, attempts: [{ input, result: step.check(input) }], durationMs };
}

function renderResults(
  records: QuestionRecord[],
  { totalMs = 10_000, onrestart = vi.fn(), onmenu = vi.fn() } = {},
) {
  return render(ResultScreen, {
    props: { set: TABLES_SET, summary: summarize(records, totalMs), onrestart, onmenu },
  });
}

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

  it('formats the total time and the average over first attempts as m:ss and seconds', () => {
    renderResults([recordOf(product, '56', 2000), recordOf(product, '56', 4000)], {
      totalMs: 65_000,
    });
    expect(screen.getByText('Totale tijd').nextElementSibling?.textContent).toBe('1:05');
    expect(screen.getByText('Gemiddeld per som').nextElementSibling?.textContent).toBe('3,0 s');
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
      expect(slot.classList.contains(tone)).toBe(false);
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

  it('calls Menu and Opnieuw once each', async () => {
    const onmenu = vi.fn();
    const onrestart = vi.fn();
    renderResults([recordOf(product, '56')], { onmenu, onrestart });
    await fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw' }));
    expect(onmenu).toHaveBeenCalledOnce();
    expect(onrestart).toHaveBeenCalledOnce();
  });
});
