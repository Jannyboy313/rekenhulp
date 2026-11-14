<script lang="ts">
  import Logo from './Logo.svelte';
</script>

<!-- Shown over every screen while the viewport is a landscape too low for any layout, such as
     a phone on its side (v4 spec §3.3). The screen under it stays mounted, with its state. -->
<div class="notice" role="status">
  <Logo size={56} />
  <h1>Scherm te laag</h1>
  <p>Draai je apparaat of maak het venster groter.</p>
</div>

<style>
  .notice {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: calc(16px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right))
      calc(16px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));
    background: var(--bg);
    text-align: center;
  }

  h1 {
    margin-top: 8px;
    font-size: 28px;
    line-height: 34px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  p {
    max-width: 480px;
    color: var(--text-2);
    font-size: 17px;
    line-height: 24px;
  }
</style>
