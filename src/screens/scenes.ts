// Fixture scenes for `npm run screenshots`: each mounts one screen state with fixed props.
// Add a scene (and a shot in screenshots/screens.spec.ts) for every new screen or state.
import { mount } from 'svelte';
import App from '../App.svelte';
import ErrorScreen from '../components/ErrorScreen.svelte';
import LessonTopicList from '../components/LessonTopicList.svelte';
import LessonView from '../components/LessonView.svelte';
import PlayScreen from '../components/PlayScreen.svelte';
import ResultScreen from '../components/ResultScreen.svelte';
import SetupScreen from '../components/SetupScreen.svelte';
import { LESSONS, lessonFor } from '../lib/lessons';
import { createRng } from '../lib/random';
import { rational } from '../lib/rational';
import { summarize, type QuestionRecord } from '../lib/results';
import { buildSession } from '../lib/session';
import { DEFAULT_SESSION_SIZE, MIXED_SET, PRACTICE_SETS } from '../lib/sets';
import { SLOT } from '../lib/slot';
import { numberStep } from '../lib/steps';
import { TABLE_FACTORS } from '../lib/topics/tables';
import type { Level, PracticeSet, Question } from '../lib/types';
import { createUpdates } from '../lib/update';
import { ANSWER_KINDS, questionOfKind } from './questionOfKind';

type Scene = (target: HTMLElement) => void;

const noop = () => {};

function setById(id: string): PracticeSet {
  const set = PRACTICE_SETS.find((candidate) => candidate.id === id);
  if (!set) throw new Error(`Unknown set: ${id}`);
  return set;
}

const tables = setById('tafels');
const measuring = setById('meten');
const proportions = setById('verhoudingen');

const lesson = lessonFor(proportions, LESSONS);
if (!lesson) throw new Error('Verhoudingen has no lesson');
const firstTopic = lesson.topics[0];
if (!firstTopic) throw new Error('Verhoudingen lesson has no topics');

function setup(set: PracticeSet, level?: Level): Scene {
  return (target) =>
    mount(SetupScreen, {
      target,
      props: {
        set,
        size: DEFAULT_SESSION_SIZE,
        level,
        tables: [...TABLE_FACTORS],
        pool: PRACTICE_SETS,
        chosenSets: PRACTICE_SETS.map((candidate) => candidate.id),
        onstart: noop,
        onback: noop,
      },
    });
}

/** Every step answered with its expected value, or one wrong attempt per question in `wrong`. */
function record(question: Question, wrong: boolean): QuestionRecord {
  const attempts = question.steps.map((step) => {
    const { expected } = step.check('');
    if (wrong) {
      // A choice step only accepts one of its options.
      const input = step.options?.find((option) => !step.check(option).correct) ?? '1';
      return { input, result: step.check(input) };
    }
    return { input: expected, result: { correct: true, expected } };
  });
  return { question, attempts: wrong ? attempts.slice(0, 1) : attempts, durationMs: 9000 };
}

function results(mistakes: number): Scene {
  const questions = buildSession(proportions, DEFAULT_SESSION_SIZE, createRng(7));
  const records = questions.map((question, index) => record(question, index < mistakes));
  const summary = summarize(records, 162_000);
  return (target) =>
    mount(ResultScreen, {
      target,
      props: { set: proportions, summary, onrestart: noop, onmenu: noop, onpractise: noop },
    });
}

function play(set: PracticeSet, question: Question): Scene {
  return (target) =>
    mount(PlayScreen, { target, props: { set, questions: [question], onfinish: noop } });
}

/** Fixed, so the runner knows the keys: 20 is right; the topic has lesson links. */
const PERCENT_QUESTION: Question = {
  key: 'screens-percent',
  topic: 'percentages',
  steps: [numberStep({ prompt: `25% van 80 = ${SLOT}`, answer: rational(20n) })],
};

export const SCENES: Record<string, Scene> = {
  ...Object.fromEntries(
    ANSWER_KINDS.map((kind) => [`question-${kind}`, play(measuring, questionOfKind(kind))]),
  ),
  'question-percent': play(proportions, PERCENT_QUESTION),
  app: (target) => mount(App, { target }),
  'app-update': (target) => {
    const updates = createUpdates(noop);
    updates.needRefresh();
    mount(App, { target, props: { updates } });
  },
  'setup-quick': setup(measuring, 'quick'),
  'setup-deep': setup(measuring, 'deep'),
  'setup-tables': setup(tables),
  'setup-mixed': setup(MIXED_SET, 'quick'),
  'results-perfect': results(0),
  'results-mistakes': results(3),
  'lesson-topics': (target) =>
    mount(LessonTopicList, {
      target,
      props: { set: proportions, lesson, onselect: noop, onback: noop },
    }),
  lesson: (target) => mount(LessonView, { target, props: { topic: firstTopic, onback: noop } }),
  error: (target) => mount(ErrorScreen, { target, props: { onhome: noop } }),
};
