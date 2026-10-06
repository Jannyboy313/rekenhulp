<script lang="ts">
  import PlayScreen from './components/PlayScreen.svelte';
  import ResultScreen from './components/ResultScreen.svelte';
  import SetOverview from './components/SetOverview.svelte';
  import SetupScreen from './components/SetupScreen.svelte';
  import { createBackGuard } from './lib/backGuard';
  import { createRng, randomSeed } from './lib/random';
  import { summarize, type QuestionRecord, type SessionSummary } from './lib/results';
  import { buildSession } from './lib/session';
  import { DEFAULT_SESSION_SIZE, PRACTICE_SETS } from './lib/sets';
  import type { PracticeSet, Question } from './lib/types';

  type Screen =
    | { name: 'sets' }
    | { name: 'setup'; set: PracticeSet }
    | { name: 'playing'; set: PracticeSet; questions: Question[] }
    | { name: 'results'; set: PracticeSet; summary: SessionSummary };

  let screen = $state.raw<Screen>({ name: 'sets' });
  // Kept in memory only while the app is open (spec §3.2: nothing is persisted).
  let size = $state(DEFAULT_SESSION_SIZE);

  // A system back never closes the app from another screen (spec §3).
  const backGuard = createBackGuard(history);

  $effect(() => {
    if (screen.name === 'sets') backGuard.disarm();
    else backGuard.arm();
  });

  function handlePopState() {
    if (!backGuard.popped()) return;
    // Ignored during a session: only Stop ends it.
    if (screen.name === 'playing') backGuard.arm();
    else showSets();
  }

  function showSets() {
    screen = { name: 'sets' };
  }

  function startSession(set: PracticeSet) {
    screen = { name: 'playing', set, questions: buildSession(set, size, createRng(randomSeed())) };
  }

  function finishSession(set: PracticeSet, records: QuestionRecord[], totalMs: number) {
    screen = { name: 'results', set, summary: summarize(records, totalMs) };
  }
</script>

<svelte:window onpopstate={handlePopState} />

{#if screen.name === 'sets'}
  <SetOverview sets={PRACTICE_SETS} onselect={(set) => (screen = { name: 'setup', set })} />
{:else if screen.name === 'setup'}
  {@const set = screen.set}
  <SetupScreen {set} bind:size onstart={() => startSession(set)} onback={showSets} />
{:else if screen.name === 'playing'}
  {@const set = screen.set}
  {@const questions = screen.questions}
  {#key questions}
    <PlayScreen
      {set}
      {questions}
      onfinish={(records, totalMs) => finishSession(set, records, totalMs)}
    />
  {/key}
{:else}
  {@const set = screen.set}
  <ResultScreen
    {set}
    summary={screen.summary}
    onrestart={() => startSession(set)}
    onmenu={showSets}
  />
{/if}
