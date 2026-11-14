<script lang="ts">
  import { hasSlot } from '../lib/slot';
  import MathText from './MathText.svelte';

  interface Props {
    /** The prompt of the exercise the user got wrong, shown in its wrong state. */
    prompt: string;
  }

  let { prompt }: Props = $props();

  const sum = $derived(hasSlot(prompt));
</script>

<!-- "Je som": the exercise stays in view while the lesson is read (v4 spec §7). -->
<p class="strip">
  <span class="label">Je som</span>
  <span class="prompt" class:text={!sum}
    ><MathText text={prompt} slot={sum ? { tone: 'bad' } : undefined} /></span
  >
</p>

<style>
  .strip {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .label {
    flex: none;
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
  }

  /* At most two lines; the full prompt is back when the lesson closes. */
  .prompt {
    min-width: 0;
    font-size: 22px;
    line-height: 28px;
    font-weight: 800;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .prompt.text {
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
  }
</style>
