// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { fromInteger, rational } from '../lib/rational';
import { booleanStep, factorizationStep, fractionStep, numberStep } from '../lib/steps';
import QuestionView from './QuestionView.svelte';

const step = numberStep({ prompt: '3 × 4 = ?', answer: fromInteger(12) });

function answerText(): string {
  return screen.getByLabelText('Jouw antwoord').textContent?.trim() ?? '';
}

function okButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
}

function errorText(): string {
  return screen.getByRole('alert').textContent?.trim() ?? '';
}

async function press(...names: string[]) {
  for (const name of names) await fireEvent.click(screen.getByRole('button', { name }));
}

describe('QuestionView', () => {
  it('shows the unit suffix next to the answer', () => {
    const withUnit = numberStep({
      prompt: '3,5 L = ? cm³',
      answer: fromInteger(3500),
      suffix: 'cm³',
    });
    render(QuestionView, { props: { step: withUnit, onanswer: vi.fn() } });
    expect(answerText()).toBe('…cm³');
  });

  it('shows the prompt, a grey placeholder, no error and a disabled OK', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.getByText('3 × 4 = ?')).toBeTruthy();
    expect(answerText()).toBe('…');
    expect(screen.getByLabelText('Jouw antwoord').querySelector('.placeholder')).not.toBeNull();
    expect(errorText()).toBe('');
    expect(okButton().disabled).toBe(true);
  });

  it('builds the answer from key presses and submits the checked result', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await press('1', '2');
    expect(answerText()).toBe('12');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith('12', { correct: true, expected: '12' });
  });

  it('shows a typographic minus, supports backspace and disables OK only when empty', async () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    await press('min', '5');
    expect(answerText()).toBe('−5');
    await press('wissen');
    expect(answerText()).toBe('−');
    expect(okButton().disabled).toBe(false);
    await press('wissen');
    expect(answerText()).toBe('…');
    expect(okButton().disabled).toBe(true);
  });

  it('rejects invalid input inline without using up the attempt', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await press('min', 'OK');
    expect(errorText()).toBe('Ongeldig getal');
    expect(onanswer).not.toHaveBeenCalled();

    await press('5');
    expect(errorText()).toBe('');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '-5',
      expect.objectContaining({ correct: false, expected: '12' }),
    );
  });

  it('shows the euro prefix before the answer', () => {
    const money = numberStep({
      prompt: '€ 60 na 25% korting = ?',
      answer: fromInteger(45),
      prefix: '€',
    });
    render(QuestionView, { props: { step: money, onanswer: vi.fn() } });
    expect(answerText()).toBe('€…');
  });

  it('offers the breuk key and the factorization keys only for their kinds', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.queryByRole('button', { name: 'breuk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'keer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'tot de macht' })).toBeNull();
  });

  describe('fraction input', () => {
    const percent = fractionStep({
      prompt: '10 is ?% van 80',
      answer: rational(25n, 2n),
      suffix: '%',
    });

    it('builds a fraction in the template and rejects an incomplete one inline', async () => {
      const onanswer = vi.fn();
      render(QuestionView, { props: { step: percent, onanswer } });
      await press('breuk');
      expect(answerText()).toBe('…/…%');
      expect(okButton().disabled).toBe(true);

      await press('2', '5', 'breuk');
      expect(answerText()).toBe('25/…%');
      await press('OK');
      expect(errorText()).toBe('Ongeldig getal');
      expect(onanswer).not.toHaveBeenCalled();

      await press('2');
      expect(answerText()).toBe('25/2%');
      await press('OK');
      expect(onanswer).toHaveBeenCalledWith(
        '25/2',
        expect.objectContaining({ correct: true, expected: '12,5 of 25/2' }),
      );
    });

    it('builds a mixed number after a whole number', async () => {
      const onanswer = vi.fn();
      render(QuestionView, { props: { step: percent, onanswer } });
      await press('1', '2', 'breuk', '1', 'breuk', '2');
      expect(answerText()).toBe('121/2%');
      await press('OK');
      expect(onanswer).toHaveBeenCalledWith('12 1/2', expect.objectContaining({ correct: true }));
    });

    it('moves the cursor to a tapped slot', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '1', 'noemer', '4');
      expect(answerText()).toBe('1/4%');
      await press('teller', '3');
      expect(answerText()).toBe('13/4%');
    });

    it('rejects a zero denominator inline', async () => {
      const onanswer = vi.fn();
      const half = fractionStep({ prompt: '1 : 2 = ?', answer: rational(1n, 2n) });
      render(QuestionView, { props: { step: half, onanswer } });
      await press('breuk', '1', 'breuk', '0', 'OK');
      expect(errorText()).toBe('Ongeldig getal');
      expect(onanswer).not.toHaveBeenCalled();
    });
  });

  it('types a factorization with × and ^ and shows it pretty-printed', async () => {
    const onanswer = vi.fn();
    const factorization = factorizationStep({ prompt: 'Ontbind 84 in priemfactoren', value: 84 });
    render(QuestionView, { props: { step: factorization, onanswer } });
    expect(screen.queryByRole('button', { name: 'komma' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'min' })).toBeNull();

    await press('2', 'tot de macht', '2', 'keer', '3', 'keer');
    expect(answerText()).toBe('2² × 3 ×');
    await press('OK');
    expect(errorText()).toBe('Ongeldige ontbinding');
    expect(onanswer).not.toHaveBeenCalled();

    await press('7', 'OK');
    expect(onanswer).toHaveBeenCalledWith(
      '2^2×3×7',
      expect.objectContaining({ correct: true, expected: '2² × 3 × 7' }),
    );
  });

  it('answers a Ja/Nee step with a single tap and shows no keypad', async () => {
    const onanswer = vi.fn();
    const prime = booleanStep({ prompt: 'Is 91 een priemgetal?', answer: false });
    render(QuestionView, { props: { step: prime, onanswer } });
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    expect(screen.queryByLabelText('Jouw antwoord')).toBeNull();

    await press('Nee');
    expect(onanswer).toHaveBeenCalledWith(
      'Nee',
      expect.objectContaining({ correct: true, expected: 'Nee' }),
    );
    await press('Ja');
    expect(onanswer).toHaveBeenCalledOnce();
  });
});
