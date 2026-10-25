<script lang="ts">
  import type { PracticeSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import SetGlyph from './SetGlyph.svelte';

  interface Props {
    set: PracticeSet;
    disabled?: boolean;
    onclick: () => void;
  }

  let { set, disabled = false, onclick }: Props = $props();
</script>

<button type="button" class="row" {disabled} {onclick}>
  <span class="tile"><SetGlyph id={set.id} name={set.name} size={28} /></span>
  <span class="text">
    <span class="name">{set.name}</span>
    <span class="description">{set.description}</span>
  </span>
  <span class="chevron"><Icon name="chevron-right" size={20} stroke={2.2} /></span>
</button>

<style>
  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 12px 11px 14px;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .tile {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--primary-tint);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .name {
    font-size: 17px;
    line-height: 22px;
    font-weight: 600;
  }

  .description {
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
  }

  .chevron {
    flex: none;
    display: flex;
    color: var(--placeholder);
  }
</style>
