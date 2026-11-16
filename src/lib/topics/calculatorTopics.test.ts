import { describe, expect, it } from 'vitest';
import type { Topic } from '../types';
import { allowsCalculator, CALCULATOR_TOPICS, GENERATORS, TOPIC_LABELS } from './index';

describe('calculator topics (calculator spec §3)', () => {
  it('are exactly the two Meetkunde topics', () => {
    const topics = (Object.keys(GENERATORS) as Topic[]).filter(allowsCalculator);
    expect(topics.sort()).toEqual(['calcCircle', 'calcVolume']);
    expect(CALCULATOR_TOPICS.size).toBe(2);
  });

  it('name the calculator in their labels', () => {
    for (const topic of CALCULATOR_TOPICS) {
      expect(TOPIC_LABELS[topic].name).toContain('met de rekenmachine');
    }
  });
});
