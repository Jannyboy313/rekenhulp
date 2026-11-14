<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
  import LessonBlocks from './LessonBlocks.svelte';
  import LessonStrip from './LessonStrip.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    topic: LessonTopic;
    /** The parent unmounts the sheet; it never closes itself (lesstof spec §3.1). */
    onclose: () => void;
    /**
     * Tablet only (v4 spec §7): the exercise the user got wrong and the name of the lesson's set.
     * With them the sheet shows the "Je som" strip, the set in its header and a button back.
     */
    prompt?: string;
    setName?: string;
  }

  let { topic, onclose, prompt, setName }: Props = $props();

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
      {#if setName}<span class="book"><Icon name="book" size={22} stroke={2} /></span>{/if}
      <div class="titles">
        {#if setName}<p class="set">Les · {setName}</p>{/if}
        <h2 id="lesson-sheet-title"><MathText text={topic.title} /></h2>
      </div>
      <button type="button" class="close" aria-label="Sluiten" onclick={onclose}>
        <Icon name="close" size={22} stroke={2.2} />
      </button>
    </header>
    <!-- Above the scrolling blocks, so the exercise stays in view (v4 spec §7). -->
    {#if prompt !== undefined}<div class="strip-row"><LessonStrip {prompt} /></div>{/if}
    <div class="content">
      <LessonBlocks blocks={topic.blocks} />
    </div>
    {#if prompt !== undefined}
      <footer>
        <button type="button" class="primary" onclick={onclose}>Terug naar de som</button>
      </footer>
    {/if}
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

  .titles {
    flex: 1;
    min-width: 0;
  }

  .book {
    display: flex;
    margin-right: 4px;
    color: var(--sky);
  }

  .set {
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: var(--muted);
  }

  h2 {
    font-size: 20px;
    line-height: 26px;
    font-weight: 700;
  }

  .strip-row {
    flex: none;
    padding: 16px 32px 0;
    background: var(--bg);
  }

  footer {
    flex: none;
    display: flex;
    padding: 16px 32px calc(28px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
  }

  footer .primary {
    flex: 1;
    height: var(--play-button-height);
    font-size: var(--play-button-text);
    box-shadow: var(--shadow-glow);
  }

  /* A tablet in portrait (v4 spec §7): 720 wide and centred, with a larger reading size. In
     landscape the lesson is LessonPane, not this sheet. */
  :global([data-layout^='tablet']) .sheet {
    width: 720px;
    margin-inline: auto;
  }

  :global([data-layout^='tablet']) header {
    padding: 16px 16px 12px 32px;
    border-bottom: 1px solid var(--border);
  }

  :global([data-layout^='tablet']) .content {
    padding: 20px 32px;
    gap: 18px;
    font-size: 18px;
    line-height: 27px;
    background: var(--bg);
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
