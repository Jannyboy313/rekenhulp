<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
  import LessonBlocks from './LessonBlocks.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    topic: LessonTopic;
    /** The parent unmounts the sheet; it never closes itself (lesstof spec §3.1). */
    onclose: () => void;
  }

  let { topic, onclose }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  // Modal: focus stays inside and the session behind it is inert.
  $effect(() => dialog?.showModal());

  function handleCancel(event: Event) {
    event.preventDefault();
    onclose();
  }

  // The sheet fills the dialog, so a click on the dialog itself is one on the backdrop.
  function handleClick(event: MouseEvent) {
    if (event.target === dialog) onclose();
  }
</script>

<!-- During a session App ignores the system back; here it closes the sheet (lesstof spec §3.1). -->
<svelte:window onpopstate={onclose} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  class="sheet"
  aria-labelledby="lesson-sheet-title"
  bind:this={dialog}
  oncancel={handleCancel}
  onclick={handleClick}
>
  <div class="inner">
    <header>
      <h2 id="lesson-sheet-title"><MathText text={topic.title} /></h2>
      <button type="button" class="close" aria-label="Sluiten" onclick={onclose}>
        <Icon name="close" size={22} stroke={2.2} />
      </button>
    </header>
    <div class="content">
      <LessonBlocks blocks={topic.blocks} />
    </div>
  </div>
</dialog>

<style>
  .sheet {
    margin: auto 0 0;
    padding: 0;
    width: 100%;
    max-width: 100%;
    height: 85dvh;
    max-height: 85dvh;
    border: none;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-panel);
    animation: slide-up 200ms ease-out;
  }

  .sheet::backdrop {
    background: var(--scrim);
  }

  .inner {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 4px 8px 16px;
  }

  h2 {
    flex: 1;
    min-width: 0;
    font-size: 20px;
    line-height: 26px;
    font-weight: 700;
  }

  .close {
    flex: none;
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Scrolls on its own; the session behind it never moves. */
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px 16px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 16px;
    line-height: 24px;
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
  }
</style>
