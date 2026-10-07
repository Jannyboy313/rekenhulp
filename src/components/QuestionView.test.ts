// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { fromInteger, rational } from '../lib/rational';
import {
  booleanStep,
  factorizationStep,
  fractionStep,
  numberStep,
  scientificStep,
} from '../lib/steps';
import type { Step } from '../lib/types';
import QuestionView from './QuestionView.svelte';

const step = numberStep({ prompt: '3 × 4 = ?', answer: fromInteger(12) });

// A minimal expression step; rewriteStep itself is tested in steps.test.ts.
const rewrite: Step = {
  kind: 'expression',
  prompt: 'Vereenvoudig in één stap: 7 × 98',
  check: (input) => ({ correct: input === '7×100-7×2', expected: '7 × 100 − 7 × 2' }),
};

function answerText(): string {
  return screen.getByLabelText('Jouw antwoord').textContent?.trim() ?? '';
}

function okButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
}

function errorText(): string {
  return screen.getByRole('alert').textContent?.trim() ?? '';
}

async function press(...names: (string | RegExp)[]) {
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

  it('sizes the prompt by its length', () => {
    const { container, unmount } = render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(container.querySelector('.prompt')?.classList.contains('large')).toBe(true);
    unmount();
    render(QuestionView, { props: { step: rewrite, onanswer: vi.fn() } });
    expect(document.querySelector('.prompt')?.classList.contains('medium')).toBe(true);
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
    expect(screen.queryByRole('button', { name: 'plus' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'haakje openen' })).toBeNull();
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
      expect(answerText()).toBe('12 en 1/2%');
      await press('OK');
      expect(onanswer).toHaveBeenCalledWith('12 1/2', expect.objectContaining({ correct: true }));
    });

    it('moves the cursor to a tapped slot', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '1', /^noemer/, '4');
      expect(answerText()).toBe('1/4%');
      await press(/^teller/, '3');
      expect(answerText()).toBe('13/4%');
    });

    it('labels the slots with their content and marks the active one as pressed', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '7');
      const teller = screen.getByRole('button', { name: 'teller: 7' });
      const noemer = screen.getByRole('button', { name: 'noemer: leeg' });
      expect(teller.getAttribute('aria-pressed')).toBe('true');
      expect(noemer.getAttribute('aria-pressed')).toBe('false');

      await press(/^noemer/);
      expect(screen.getByRole('button', { name: /^teller/ }).getAttribute('aria-pressed')).toBe(
        'false',
      );
      expect(screen.getByRole('button', { name: /^noemer/ }).getAttribute('aria-pressed')).toBe(
        'true',
      );
    });

    it('moves the cursor as soon as a slot is pressed', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '1');
      await fireEvent.pointerDown(screen.getByRole('button', { name: /^noemer/ }));
      await press('4');
      expect(answerText()).toBe('1/4%');
    });

    it('clears the inline error when a slot is tapped', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '2', '5', 'breuk', 'OK');
      expect(errorText()).toBe('Ongeldig getal');
      await press(/^noemer/);
      expect(errorText()).toBe('');
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

  it('types an expression and rejects an incomplete one inline', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step: rewrite, onanswer } });
    expect(screen.queryByRole('button', { name: 'komma' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'tot de macht' })).toBeNull();

    await press('7', 'keer', 'haakje openen', '1', '0', '0', 'min', '2');
    expect(answerText()).toBe('7 × (100 − 2');
    await press('OK');
    expect(errorText()).toBe('Ongeldige som');
    expect(onanswer).not.toHaveBeenCalled();

    await press('haakje sluiten');
    expect(errorText()).toBe('');
    expect(answerText()).toBe('7 × (100 − 2)');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '7×(100-2)',
      expect.objectContaining({ correct: false, expected: '7 × 100 − 7 × 2' }),
    );
  });

  it('types scientific notation with existing keys and rejects an unfinished power', async () => {
    const onanswer = vi.fn();
    const scientific = scientificStep({
      prompt: 'Schrijf in wetenschappelijke notatie: 0,0045',
      coefficient: rational(9n, 2n),
      exponent: -3,
    });
    render(QuestionView, { props: { step: scientific, onanswer } });

    await press('4', 'komma', '5', 'keer', '1', '0', 'tot de macht', 'min');
    expect(answerText()).toBe('4,5 × 10^−');
    await press('OK');
    expect(errorText()).toBe('Ongeldige notatie');
    expect(onanswer).not.toHaveBeenCalled();

    await press('3');
    expect(errorText()).toBe('');
    expect(answerText()).toBe('4,5 × 10⁻³');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '4,5×10^-3',
      expect.objectContaining({ correct: true, expected: '4,5 × 10⁻³' }),
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

  describe('kladblok', () => {
    function cell(n: number): HTMLElement {
      return screen.getByRole('button', { name: new RegExp(`^Kladblok vak ${n}:`) });
    }

    function cellLabels(): string[] {
      return screen
        .getAllByRole('button', { name: /^Kladblok vak/ })
        .map((button) => button.getAttribute('aria-label') ?? '');
    }

    it('is hidden unless the step shows it', () => {
      render(QuestionView, { props: { step, onanswer: vi.fn() } });
      expect(screen.queryByRole('group', { name: 'Kladblok' })).toBeNull();
    });

    it('shows six empty cells with the answer field active', () => {
      render(QuestionView, { props: { step, scratchpad: true, onanswer: vi.fn() } });
      expect(cellLabels()).toEqual([
        'Kladblok vak 1: leeg',
        'Kladblok vak 2: leeg',
        'Kladblok vak 3: leeg',
        'Kladblok vak 4: leeg',
        'Kladblok vak 5: leeg',
        'Kladblok vak 6: leeg',
      ]);
      expect(cell(1).getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByLabelText('Jouw antwoord').classList.contains('focused')).toBe(true);
      expect(okButton().disabled).toBe(true);
      expect(screen.queryByRole('button', { name: 'spatie' })).toBeNull();
    });

    it('types sums into a tapped cell and swaps OK for a spatie', async () => {
      render(QuestionView, { props: { step, scratchpad: true, onanswer: vi.fn() } });
      await press(/^Kladblok vak 2:/, 'min', '9', '0', 'keer', '2');
      expect(cell(2).getAttribute('aria-pressed')).toBe('true');
      expect(cell(2).getAttribute('aria-label')).toBe('Kladblok vak 2: −90×2');
      await press('wissen');
      expect(cell(2).textContent).toBe('−90×');
      await press('3', 'is', 'min', '2', '7', '0', 'spatie', '1', 'komma', '5');
      expect(cell(2).textContent).toBe('−90×3=−270 1,5');
      expect(answerText()).toBe('…');
      expect(screen.getByLabelText('Jouw antwoord').classList.contains('focused')).toBe(false);
      expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    });

    it('switches cells by tapping them, then submits after the answer field is tapped', async () => {
      const onanswer = vi.fn();
      render(QuestionView, { props: { step, scratchpad: true, onanswer } });
      await press('1', '2');
      await press(/^Kladblok vak 1:/, '1', /^Kladblok vak 6:/, '6');
      expect(cellLabels()).toEqual([
        'Kladblok vak 1: 1',
        'Kladblok vak 2: leeg',
        'Kladblok vak 3: leeg',
        'Kladblok vak 4: leeg',
        'Kladblok vak 5: leeg',
        'Kladblok vak 6: 6',
      ]);
      expect(cell(6).getAttribute('aria-pressed')).toBe('true');

      await press('Naar antwoordveld');
      expect(cell(6).getAttribute('aria-pressed')).toBe('false');
      expect(answerText()).toBe('12');
      await press('OK');
      expect(onanswer).toHaveBeenCalledWith('12', { correct: true, expected: '12' });
    });

    it('hands the keypad back when the answer field is tapped', async () => {
      render(QuestionView, { props: { step, scratchpad: true, onanswer: vi.fn() } });
      await press('5', /^Kladblok vak 1:/, '7', 'Naar antwoordveld');
      expect(screen.queryByRole('button', { name: 'Naar antwoordveld' })).toBeNull();
      await press('3');
      expect(answerText()).toBe('53');
      expect(cell(1).getAttribute('aria-label')).toBe('Kladblok vak 1: 7');
    });

    it('hands the keypad back on press without the follow-up click selecting a slot', async () => {
      const percent = fractionStep({
        prompt: '10 is ?% van 80',
        answer: rational(25n, 2n),
        suffix: '%',
      });
      render(QuestionView, { props: { step: percent, scratchpad: true, onanswer: vi.fn() } });
      await press('breuk', '1', /^Kladblok vak 1:/);
      await fireEvent.pointerDown(screen.getByRole('button', { name: 'Naar antwoordveld' }), {
        button: 0,
      });
      await fireEvent.click(screen.getByRole('button', { name: /^noemer/ }), { detail: 1 });
      expect(screen.queryByRole('button', { name: 'Naar antwoordveld' })).toBeNull();
      expect(screen.getByRole('button', { name: /^teller/ }).getAttribute('aria-pressed')).toBe(
        'true',
      );
      expect(screen.getByRole('button', { name: 'breuk' })).toBeTruthy();
    });

    it('swaps in the kladblok keys for fraction and factorization steps', async () => {
      const percent = fractionStep({
        prompt: '10 is ?% van 80',
        answer: rational(25n, 2n),
        suffix: '%',
      });
      const { unmount } = render(QuestionView, {
        props: { step: percent, scratchpad: true, onanswer: vi.fn() },
      });
      await press('breuk', '1', /^Kladblok vak 1:/);
      expect(screen.getByRole('button', { name: 'spatie' })).toBeTruthy();
      await press('3', 'breuk', '4');
      expect(cell(1).getAttribute('aria-label')).toBe('Kladblok vak 1: 3/4');
      await press('Naar antwoordveld');
      expect(screen.queryByRole('button', { name: 'spatie' })).toBeNull();
      expect(answerText()).toBe('1/…%');
      unmount();

      const factorization = factorizationStep({ prompt: 'Ontbind 84 in priemfactoren', value: 84 });
      render(QuestionView, { props: { step: factorization, scratchpad: true, onanswer: vi.fn() } });
      await press(/^Kladblok vak 1:/);
      expect(screen.getByRole('button', { name: 'spatie' })).toBeTruthy();
      await press('min', '2', 'komma', '5', 'plus', '1', 'spatie', '2', 'tot de macht', '3');
      expect(cell(1).getAttribute('aria-label')).toBe('Kladblok vak 1: −2,5+1 2³');
      expect(answerText()).toBe('…');
    });

    it('shows the kladblok keys in 4 columns with the spatie in the last one', async () => {
      function columns(): string {
        return document.querySelector<HTMLElement>('.keypad')!.style.getPropertyValue('--columns');
      }
      const { unmount } = render(QuestionView, {
        props: { step, scratchpad: true, onanswer: vi.fn() },
      });
      expect(columns()).toBe('3');
      await press(/^Kladblok vak 1:/);
      expect(columns()).toBe('4');
      unmount();

      render(QuestionView, { props: { step: rewrite, scratchpad: true, onanswer: vi.fn() } });
      expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 3');
      expect(screen.queryByRole('button', { name: 'is' })).toBeNull();
      await press(/^Kladblok vak 1:/);
      expect(columns()).toBe('4');
      expect(screen.getByRole('button', { name: 'is' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'spatie' }).style.gridColumn).toBe('');
      await press('Naar antwoordveld');
      expect(screen.queryByRole('button', { name: 'is' })).toBeNull();
    });
  });
});
