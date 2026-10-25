// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { SLOT } from '../lib/slot';
import type { AnswerKind, CheckResult } from '../lib/types';
import Feedback from './Feedback.svelte';

function renderFeedback(
  overrides: {
    prompt?: string;
    kind?: AnswerKind;
    input?: string;
    result?: CheckResult;
    prefix?: string;
    suffix?: string;
    onnext?: () => void;
  } = {},
) {
  return render(Feedback, {
    props: {
      prompt: `91 : 7 = ${SLOT}`,
      kind: 'number',
      input: '-12',
      result: { correct: false, expected: '13' },
      onnext: vi.fn(),
      ...overrides,
    },
  });
}

function tileValues(): string[] {
  return [...document.querySelectorAll('.tile-value')].map((el) => el.textContent ?? '');
}

function blockLabels(): string[] {
  return [...document.querySelectorAll('.block-label')].map((el) => el.textContent ?? '');
}

describe('Feedback', () => {
  it('shows "Niet goed" and the two answers in their own tiles, without a strike-through', () => {
    renderFeedback({ result: { correct: false, expected: '13', explanation: '13 × 7 = 91' } });
    expect(screen.getByText('Niet goed')).toBeTruthy();
    expect(screen.getByText('Jouw antwoord')).toBeTruthy();
    expect(screen.getByText('Goed antwoord')).toBeTruthy();
    expect(tileValues()).toEqual(['−12', '13']);
    expect(document.querySelector('del, s, [style*="line-through"]')).toBeNull();
    expect(screen.queryByText('Fout')).toBeNull();
    expect(screen.queryByText('Juist antwoord')).toBeNull();
  });

  it('is a status panel without a keypad', () => {
    renderFeedback();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(document.querySelector('.keypad')).toBeNull();
  });

  it('focuses Verder and calls onnext when it is pressed, without a timer', async () => {
    vi.useFakeTimers();
    try {
      const onnext = vi.fn();
      renderFeedback({ onnext });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Verder' }));
      await vi.advanceTimersByTimeAsync(5000);
      expect(onnext).not.toHaveBeenCalled();
      await fireEvent.click(screen.getByRole('button', { name: 'Verder' }));
      expect(onnext).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows only a Tip block for a tip, only an Uitleg block for an explanation', () => {
    const { unmount } = renderFeedback({
      result: { correct: false, expected: '45', tip: 'Trek de korting nog af.' },
    });
    expect(blockLabels()).toEqual(['Tip']);
    unmount();
    renderFeedback({ result: { correct: false, expected: '45', explanation: '60 − 15 = 45' } });
    expect(blockLabels()).toEqual(['Uitleg']);
  });

  it('shows the tip before the explanation, and neither when there are none', () => {
    const { unmount } = renderFeedback({
      result: { correct: false, expected: '45', tip: 'Een tip.', explanation: 'Een uitleg.' },
    });
    expect(blockLabels()).toEqual(['Tip', 'Uitleg']);
    unmount();
    renderFeedback();
    expect(blockLabels()).toEqual([]);
  });

  it('lets only the Uitleg block scroll', () => {
    renderFeedback({
      result: { correct: false, expected: '45', tip: 'Een tip.', explanation: 'Een uitleg.' },
    });
    const [tip, explanation] = [...document.querySelectorAll('.block')];
    expect(tip!.classList.contains('scrolls')).toBe(false);
    expect(explanation!.classList.contains('scrolls')).toBe(true);
  });

  it('puts the unit on both answers', () => {
    renderFeedback({
      prompt: `Een rechthoek is 18 cm lang en 7 cm breed. Hoe groot is de oppervlakte?`,
      input: '402',
      result: { correct: false, expected: '126', explanation: '18 × 7 = 126' },
      suffix: 'cm²',
    });
    expect(tileValues()).toEqual(['402 cm²', '126 cm²']);
  });

  it('puts a prefix before both answers and keeps a percent sign against the number', () => {
    const { unmount } = renderFeedback({
      input: '15',
      result: { correct: false, expected: '45' },
      prefix: '€',
    });
    expect(tileValues()).toEqual(['€ 15', '€ 45']);
    unmount();
    renderFeedback({ input: '15', result: { correct: false, expected: '25' }, suffix: '%' });
    expect(tileValues()).toEqual(['15%', '25%']);
  });

  it('shows a factorization answer pretty-printed', () => {
    renderFeedback({
      prompt: 'Ontbind 84 in priemfactoren',
      kind: 'factorization',
      input: '2^2×21',
      result: { correct: false, expected: '2² × 3 × 7' },
    });
    expect(tileValues()).toEqual(['2² × 21', '2² × 3 × 7']);
  });

  it('stacks fractions in the given and the correct answer', () => {
    const { container } = renderFeedback({
      prompt: '10 is ?% van 80',
      kind: 'fraction',
      input: '-12 1/2',
      result: { correct: false, expected: '12 1/2' },
    });
    expect(tileValues()).toEqual(['−12 en 1/2', '12 en 1/2']);
    expect(container.querySelectorAll('.tile .fraction')).toHaveLength(2);
  });

  it('shows the unknown of a sum in the bad colour, without filling it in', () => {
    renderFeedback();
    const prompt = document.querySelector('.prompt')!;
    expect(prompt.classList.contains('sum')).toBe(true);
    expect(prompt.textContent).toBe('91 : 7 = ?');
    expect(prompt.querySelector('.slot.bad')?.textContent).toBe('?');
  });

  it('leaves a sentence without an unknown as plain question text', () => {
    renderFeedback({ prompt: 'Is 91 een priemgetal?', kind: 'boolean', input: 'Ja' });
    const prompt = document.querySelector('.prompt')!;
    expect(prompt.classList.contains('text')).toBe(true);
    expect(prompt.querySelector('.slot')).toBeNull();
    expect(prompt.textContent).toBe('Is 91 een priemgetal?');
    expect(tileValues()).toEqual(['Ja', '13']);
  });

  it.each([
    [`3 × 4 = ${SLOT}`, 'large'],
    [`KGV van 1\u{202f}234 en 5\u{202f}678 = ${SLOT}`, 'medium'],
  ])('sizes the sum %j in steps (%s)', (prompt, size) => {
    renderFeedback({ prompt });
    expect(document.querySelector('.prompt')!.classList).toContain(size);
  });
});
