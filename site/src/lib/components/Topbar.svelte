<script lang="ts">
  let { title = "Atölye" }: { title?: string; search?: boolean } = $props();
  $effect(() => { document.title = title === "Atölye" ? "Tren · 45 mm model atölyesi" : `${title} · Tren`; });
</script>
