// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { numberStep } from '../lib/steps';
import QuestionView from './QuestionView.svelte';

const step = numberStep({ prompt: '3 × 4 = ?', answer: fromInteger(12) });

function answerText(): string {
  return screen.getByLabelText('Jouw antwoord').textContent?.trim() ?? '';
}

function okButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
}

describe('QuestionView', () => {
  it('shows the unit suffix next to the answer', () => {
    const withUnit = numberStep({
      prompt: '3,5 L = ? cm³',
      answer: fromInteger(3500),
      suffix: 'cm³',
    });
    render(QuestionView, { props: { step: withUnit, onanswer: vi.fn() } });
    expect(answerText()).toBe('?cm³');
  });

  it('shows the prompt, an empty answer and a disabled OK', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.getByText('3 × 4 = ?')).toBeTruthy();
    expect(answerText()).toBe('?');
    expect(okButton().disabled).toBe(true);
  });

  it('builds the answer from key presses and submits the checked result', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await fireEvent.click(screen.getByRole('button', { name: '1' }));
    await fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(answerText()).toBe('12');
    await fireEvent.click(okButton());
    expect(onanswer).toHaveBeenCalledWith('12', { correct: true, expected: '12' });
  });

  it('shows a typographic minus and supports backspace', async () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'min' }));
    await fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(answerText()).toBe('−5');
    await fireEvent.click(screen.getByRole('button', { name: 'wissen' }));
    expect(answerText()).toBe('−');
    expect(okButton().disabled).toBe(true);
  });
});
