<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
    train: "M6 3h12v13H6zM6 8h12M9 3V1m6 2V1M4 21l3-5m13 5-3-5M8 20h8M9 12h.01M15 12h.01",
    models: "m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10",
    book: "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15",
    parts: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17.5 14v7M14 17.5h7",
    track: "M7 2v20M17 2v20M4 5h16M4 10h16M4 15h16M4 20h16",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    chevron: "m9 5 7 7-7 7",
    search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.5-2 5 5",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    layers: "m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 17l10 5 10-5",
    bolt: "m13 2-8 12h6l-1 8 9-13h-6l1-7Z",
    check: "m5 12 4 4L19 6",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 10v7M12 6h.01",
    github: "M9 19c-4 1-4-2-6-2m12 5v-4a4 4 0 0 0-1-3c3 0 6-2 6-5a5 5 0 0 0-1-3c0-1 0-2-.5-3-2 0-3 1-4 1a12 12 0 0 0-5 0c-1 0-2-1-4-1-.5 1-.5 2-.5 3a5 5 0 0 0-1 3c0 3 3 5 6 5a4 4 0 0 0-1 3v4",
    play: "m9 4 12 8-12 8V4Z",
    reset: "M3 10a9 9 0 1 1 1 7M3 3v7h7",
    light: "M9 18h6M10 22h4M12 2v2M3 6l2 2M21 6l-2 2M2 13h2M20 13h2M8 16a6 6 0 1 1 8 0l-1 2H9l-1-2Z",
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.models} /></svg>
