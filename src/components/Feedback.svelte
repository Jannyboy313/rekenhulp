<script lang="ts">
  import type { Snippet } from 'svelte';
  import { displayAnswer } from '../lib/inputModels';
  import { promptSize } from '../lib/promptSize';
  import { hasSlot } from '../lib/slot';
  import type { LessonTopic } from '../lib/lessons/types';
  import type { AnswerKind, CheckResult } from '../lib/types';
  import Icon from './Icon.svelte';
  import LessonLinks from './LessonLinks.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    prompt: string;
    kind: AnswerKind;
    input: string;
    /** A wrong answer: the correct one is shown by PlayScreen/QuestionView itself. */
    result: CheckResult;
    prefix?: string;
    suffix?: string;
    onnext: () => void;
    /** Lesson topics of the exercise's topic; PlayScreen opens them in a sheet (lesstof §3.1). */
    lessons?: readonly LessonTopic[];
    onlesson?: (topic: LessonTopic, button: HTMLButtonElement) => void;
    /** Passed through to LessonLinks: the lesson that is open next to the panel (v4 spec §7). */
    opened?: LessonTopic | null;
    /** Rendered in the place of the prompt: PlayScreen's lesson pane in landscape (v4 spec §7). */
    pane?: Snippet;
  }

  let {
    prompt,
    kind,
    input,
    result,
    prefix,
    suffix,
    onnext,
    lessons = [],
    onlesson = () => {},
    opened,
    pane,
  }: Props = $props();

  let nextButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    nextButton?.focus();
  });
</script>

<!-- A value with its unit; the percent sign sticks to the number (lib/units.ts). -->
{#snippet value(text: string)}{#if prefix}{prefix}{' '}{/if}<MathText
    {text}
  />{#if suffix}{#if suffix !== '%'}{' '}{/if}{suffix}{/if}{/snippet}

{#snippet links()}
  <div class="lesson-links"><LessonLinks topics={lessons} onopen={onlesson} {opened} /></div>
{/snippet}

{#snippet block(label: string, text: string, scrolls: boolean, withLinks: boolean)}
  <div class="block" class:scrolls>
    <p class="block-label"><Icon name="bulb" size={16} stroke={2} />{label}</p>
    <p class="block-body"><MathText {text} /></p>
    {#if withLinks}{@render links()}{/if}
  </div>
{/snippet}

<div class="feedback">
  {#if pane}
    {@render pane()}
  {:else}
    <div class="prompt-area">
      {#if hasSlot(prompt)}
        <p class="prompt sum {promptSize(prompt)}">
          <MathText text={prompt} slot={{ tone: 'bad' }} />
        </p>
      {:else if kind === 'boolean'}
        <p class="prompt yesno"><MathText text={prompt} /></p>
      {:else}
        <p class="prompt text" class:choice-question={kind === 'choice'}>
          <MathText text={prompt} />
        </p>
      {/if}
    </div>
  {/if}
  <div class="panel" role="status" aria-live="off">
    <div class="verdict">
      <span class="badge"><Icon name="cross" size={22} stroke={2.6} /></span>
      <p class="verdict-text">Niet goed</p>
    </div>
    <div class="tiles">
      <div class="tile bad">
        <p class="tile-label">Jouw antwoord</p>
        <p class="tile-value">{@render value(displayAnswer(kind, input))}</p>
      </div>
      <div class="tile good">
        <p class="tile-label">Goed antwoord</p>
        <p class="tile-value">{@render value(result.expected)}</p>
      </div>
    </div>
    {#if result.tip}{@render block('Tip', result.tip, false, false)}{/if}
    <!-- The lesson link sits in the Uitleg block, or on its own in its place (lesstof §3.1). -->
    {#if result.explanation}
      {@render block('Uitleg', result.explanation, true, lessons.length > 0)}
    {:else if lessons.length > 0}
      {@render links()}
    {/if}
    <button type="button" class="primary next" bind:this={nextButton} onclick={onnext}
      >Verder</button
    >
  </div>
</div>

<style>
  .feedback {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    animation: appear 150ms ease-out;
  }

  /* The sum or question text stays visible above the panel; when the screen is short, only this
     area shrinks (down to 96 px) and scrolls, before the Uitleg block does (spec §3.3, §3.4). */
  .prompt-area {
    flex: 1 1 96px;
    min-height: 96px;
    display: flex;
    overflow-y: auto;
  }

  .prompt {
    margin: auto;
    text-align: center;
    text-wrap: balance;
  }

  .prompt.sum {
    padding: 0 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  /* The size steps of the question view (spec §3.3), one step larger: the sum stays the focus. */
  .prompt.sum.large {
    font-size: var(--play-wrong-large);
  }

  .prompt.sum.medium {
    font-size: var(--play-wrong-medium);
  }

  .prompt.sum.small {
    font-size: var(--play-wrong-small);
  }

  /* The text sizes of the question view, so the text does not jump. */
  .prompt.text {
    padding: 0 24px;
    font-size: var(--play-text);
    line-height: var(--play-text-line);
    font-weight: 700;
  }

  .prompt.text.choice-question {
    font-size: var(--play-choice-text);
    line-height: var(--play-choice-line);
  }

  .prompt.yesno {
    padding: 0 24px;
    font-size: var(--play-yesno);
    line-height: var(--play-yesno-line);
    font-weight: 800;
  }

  .panel {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0 12px calc(24px + env(safe-area-inset-bottom));
    padding: 20px;
    border-radius: 24px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: var(--shadow-panel);
  }

  .verdict {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .badge {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bad-tint);
    color: var(--bad);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .verdict-text {
    font-size: 22px;
    font-weight: 800;
    color: var(--bad-text);
  }

  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .tile {
    min-width: 0;
    padding: 10px 14px;
    border-radius: 14px;
  }

  .tile.bad {
    background: var(--bad-tint);
    color: var(--bad-text);
  }

  .tile.good {
    background: var(--good-tint);
    color: var(--good-text);
  }

  .tile-label {
    font-size: 12px;
    font-weight: 600;
  }

  .tile-value {
    font-size: 22px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .tile.good .tile-value {
    font-weight: 800;
    color: var(--text);
  }

  .block {
    padding: 14px 16px;
    border-radius: 14px;
    background: var(--bg);
  }

  /* Only the explanation can be long; the tip stays short. */
  .block.scrolls {
    max-height: 220px;
    overflow-y: auto;
  }

  .block-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--sky-text);
  }

  .block-body {
    font-size: 16px;
    line-height: 24px;
    white-space: pre-line;
  }

  .block .lesson-links {
    margin-top: 8px;
  }

  .next {
    height: var(--play-button-height);
    font-size: var(--play-button-text);
    box-shadow: var(--shadow-glow);
  }

  :global([data-layout^='tablet']) .panel {
    margin: 0 0 calc(var(--play-bottom) + env(safe-area-inset-bottom));
  }

  /* Landscape (v4 spec §4.2): the prompt in the left pane, the panel in the place of the keypad,
     bottom-aligned and never higher than the pane: the Uitleg block shrinks and scrolls, Verder
     stays in view. */
  :global([data-layout^='tablet-landscape']) .feedback {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--play-pane);
    grid-template-rows: minmax(0, 1fr);
    column-gap: var(--play-pane-gap);
    padding: var(--play-body-top) 0 calc(var(--play-body-bottom) + env(safe-area-inset-bottom));
  }

  /* The last resort on a low screen with a long tip: the panel itself scrolls. */
  :global([data-layout^='tablet-landscape']) .panel {
    align-self: end;
    max-height: 100%;
    min-height: 0;
    overflow-y: auto;
  }

  :global([data-layout^='tablet-landscape']) .panel > :not(.scrolls) {
    flex: none;
  }

  :global([data-layout^='tablet-landscape']) .block.scrolls {
    min-height: 56px;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
