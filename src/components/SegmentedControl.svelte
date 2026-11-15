<script lang="ts" generics="T">
  /** A radio group of segments (spec §3.2); arrow keys skip the options that are not enabled. */
  interface Props {
    options: readonly { value: T; label: string }[];
    value: T;
    /** The values that can be chosen; all when absent. */
    enabled?: readonly T[];
    labelledby: string;
  }

  let { options, value = $bindable(), enabled, labelledby }: Props = $props();

  const values = $derived(options.map((option) => option.value));
  const choosable = $derived(enabled ?? values);

  function onkeydown(event: KeyboardEvent) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = choosable[choosable.indexOf(value) + step];
    if (next === undefined) return;
    value = next;
    const group = event.currentTarget as HTMLElement;
    queueMicrotask(() => group.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
  }
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
  class="segments"
  role="radiogroup"
  aria-labelledby={labelledby}
  style:grid-template-columns="repeat({options.length}, 1fr)"
  {onkeydown}
>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      class="segment"
      aria-checked={value === option.value}
      tabindex={value === option.value ? 0 : -1}
      disabled={!choosable.includes(option.value)}
      onclick={() => (value = option.value)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .segments {
    display: grid;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--sky-track);
  }

  .segment {
    height: 44px;
    min-height: 0;
    padding: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-2);
    font-size: 16px;
    font-weight: 600;
  }

  .segment[aria-checked='true'] {
    background: var(--surface);
    color: var(--primary);
    font-weight: 700;
    box-shadow: var(--shadow-segment);
  }

  :global([data-layout^='tablet']) .segment {
    height: 52px;
    font-size: 18px;
  }
</style>
