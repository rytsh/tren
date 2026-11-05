<script lang="ts">
  import photos from "../generated/photos.json";

  let {
    id,
    sizes = "100vw",
    eager = false,
    class: klass = "",
    fit = "cover",
    position = "50% 50%",
    drift = false,
  }: { id: string; sizes?: string; eager?: boolean; class?: string; fit?: "cover" | "contain"; position?: string; drift?: boolean } = $props();

  const photo = $derived(photos.find((p) => p.id === id));
</script>

{#if photo}
  <figure class="photo {klass}">
    <div class="frame">
      <img
        src={photo.src}
        srcset={photo.srcset}
        {sizes}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        class:drift
        style="object-fit:{fit};object-position:{position}"
      />
    </div>
  </figure>
{/if}

<style>
  .photo {
    margin: 0;
    height: 100%;
  }
  .frame {
    overflow: hidden;
    height: 100%;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
