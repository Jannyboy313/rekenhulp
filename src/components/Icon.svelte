<script lang="ts" module>
  export type IconName =
    'chevron-left' | 'chevron-right' | 'close' | 'check' | 'cross' | 'pen' | 'repeat' | 'bulb';

  const PATHS: Record<IconName, string> = {
    'chevron-left': 'M15 5l-7 7 7 7',
    'chevron-right': 'M9 5l7 7-7 7',
    close: 'M6 6l12 12M18 6L6 18',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    cross: 'M6 6l12 12M18 6L6 18',
    pen: 'M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3',
    repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  };
</script>

<script lang="ts">
  interface Props {
    name: IconName;
    size?: number;
    stroke?: number;
  }

  let { name, size = 24, stroke = 2.2 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={PATHS[name]} /></svg
>
