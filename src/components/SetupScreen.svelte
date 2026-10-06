<script lang="ts">
  import { DEFAULT_SESSION_SIZE, describeSetTopics, SESSION_SIZES } from '../lib/sets';
  import type { PracticeSet } from '../lib/types';

  interface Props {
    set: PracticeSet;
    size?: number;
    onstart: () => void;
    onback: () => void;
  }

  let { set, size = $bindable(DEFAULT_SESSION_SIZE), onstart, onback }: Props = $props();
</script>

<main class="setup">
  <header>
    <button type="button" class="secondary" onclick={onback}>Terug</button>
    <h1>{set.name}</h1>
  </header>

  <section>
    <h2>Onderwerpen</h2>
    <ul>
      {#each describeSetTopics(set) as label (label)}
        <li>{label}</li>
      {/each}
    </ul>
  </section>

  <fieldset>
    <legend>Aantal opgaven</legend>
    <div class="sizes">
      {#each SESSION_SIZES as option (option)}
        <label>
          <input type="radio" name="size" value={option} bind:group={size} />
          <span>{option}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <button type="button" class="primary start" onclick={onstart}>Start</button>
</main>

<style>
  .setup {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2,
  legend {
    font-size: 1rem;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }

  .sizes {
    display: grid;
    gap: 0.5rem;
  }

  label {
    position: relative;
  }

  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
  }

  label span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    border-radius: var(--radius);
    background: var(--key);
    font-weight: 600;
  }

  input:checked + span {
    background: var(--primary);
    color: var(--primary-text);
  }

  .start {
    margin-top: auto;
    min-height: 3.5rem;
  }
</style>
