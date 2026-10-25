<script lang="ts">
  interface Props {
    size?: number;
  }

  let { size = 48 }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7656EA" />
      <stop offset="1" stop-color="#4B33B8" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#logo-gradient)" />
  <g stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M20 30h20M30 20v20" />
    <path d="M60 30h20" />
    <path d="M21 61l18 18M39 61L21 79" />
    <path d="M60 70h20" />
  </g>
  <circle cx="70" cy="59" r="4.4" fill="#F5B700" />
  <circle cx="70" cy="81" r="4.4" fill="#F5B700" />
</svg>
