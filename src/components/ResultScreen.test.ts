// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { summarize, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { factorizationStep } from '../lib/steps';
import type { Question } from '../lib/types';
import ResultScreen from './ResultScreen.svelte';

describe('ResultScreen', () => {
  it('lists a wrong factorization pretty-printed', () => {
    const step = factorizationStep({
      prompt: 'Ontbind 84 in priemfactoren',
      value: 84,
      explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    });
    const question: Question = { key: 'factorization:84', topic: 'tables', steps: [step] };
    const record: QuestionRecord = {
      question,
      attempts: [{ input: '2^2×21', result: step.check('2^2×21') }],
      durationMs: 5000,
    };
    render(ResultScreen, {
      props: {
        set: TABLES_SET,
        summary: summarize([record], 5000),
        onrestart: vi.fn(),
        onmenu: vi.fn(),
      },
    });
    expect(screen.getByText('Ontbind 84 in priemfactoren')).toBeTruthy();
    expect(screen.getByText('2² × 21')).toBeTruthy();
    expect(screen.getByText('2² × 3 × 7')).toBeTruthy();
    expect(screen.getByText('84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7')).toBeTruthy();
  });
});
