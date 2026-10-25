<script lang="ts">
  import { displayAnswer } from '../lib/inputModels';
  import { promptSize } from '../lib/promptSize';
  import { hasSlot } from '../lib/slot';
  import type { AnswerKind, CheckResult } from '../lib/types';
  import Icon from './Icon.svelte';
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
  }

  let { prompt, kind, input, result, prefix, suffix, onnext }: Props = $props();

  let nextButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    nextButton?.focus();
  });
</script>

<!-- A value with its unit; the percent sign sticks to the number (lib/units.ts). -->
{#snippet value(text: string)}{#if prefix}{prefix}{' '}{/if}<MathText
    {text}
  />{#if suffix}{#if suffix !== '%'}{' '}{/if}{suffix}{/if}{/snippet}

{#snippet block(label: string, text: string, scrolls: boolean)}
  <div class="block" class:scrolls>
    <p class="block-label"><Icon name="bulb" size={16} stroke={2} />{label}</p>
    <p class="block-body"><MathText {text} /></p>
  </div>
{/snippet}

<div class="feedback">
  <div class="prompt-area">
    {#if hasSlot(prompt)}
      <p class="prompt sum {promptSize(prompt)}">
        <MathText text={prompt} slot={{ tone: 'bad' }} />
      </p>
    {:else}
      <p class="prompt text"><MathText text={prompt} /></p>
    {/if}
  </div>
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
    {#if result.tip}{@render block('Tip', result.tip, false)}{/if}
    {#if result.explanation}{@render block('Uitleg', result.explanation, true)}{/if}
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
    font-size: 44px;
  }

  .prompt.sum.medium {
    font-size: 32px;
  }

  .prompt.sum.small {
    font-size: 24px;
  }

  .prompt.text {
    padding: 0 24px;
    font-size: 22px;
    line-height: 30px;
    font-weight: 700;
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

  .next {
    box-shadow: var(--shadow-glow);
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
