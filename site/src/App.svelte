<script lang="ts">
  import Router, { router } from "svelte-spa-router";
  import { routes } from "./routes";
  import Header from "./lib/components/Header.svelte";
  let path = $derived(router.location);
  $effect(() => { void path; window.scrollTo({ top: 0 }); });
</script>

<Header {path} />
<main><Router {routes} /></main>
