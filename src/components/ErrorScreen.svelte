<script lang="ts">
  interface Props {
    onhome: () => void;
  }

  let { onhome }: Props = $props();
</script>

<!-- Shown instead of a dead screen after an unexpected error (spec §3). -->
<main class="error" role="alert">
  <div class="message">
    <h1>Er ging iets mis</h1>
    <p>Dit scherm kon niet worden getoond. Ga terug naar het begin en probeer het opnieuw.</p>
  </div>
  <button type="button" class="primary" onclick={onhome}>Naar het begin</button>
</main>

<style>
  .error {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: calc(24px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
  }

  .message {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }

  h1 {
    font-size: 28px;
    line-height: 34px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  p {
    color: var(--text-2);
    font-size: 17px;
    line-height: 24px;
  }
</style>
