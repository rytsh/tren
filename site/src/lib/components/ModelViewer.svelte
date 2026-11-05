<script lang="ts">
  import { onMount } from "svelte";
  import type { AssemblyStyle } from "../cadAssembly";
  import type { Object3D, Material } from "three";
  let { assembly, name = "Model" }: { assembly: string; name?: string } = $props();
  let canvas: HTMLCanvasElement;
  let loading = $state(true);
  let error = $state("");
  let style = $state<AssemblyStyle>("workshop");
  let resetView: () => void = () => {};
  let applyStyle: (s: AssemblyStyle) => void = () => {};

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};
    async function start() {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { loadAssembly } = await import("../cadAssembly");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 1, 10000);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.minDistance = 60;
      controls.maxDistance = 2000;
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ab84, 2.1));
      const sun = new THREE.DirectionalLight(0xffffff, 1.9);
      sun.position.set(250, 500, 320);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300 });
      scene.add(sun);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(600, 64), new THREE.ShadowMaterial({ color: 0x4a3f20, opacity: 0.14 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      let frame = 0, visible = true, ready = false;
      const resize = () => { if (!canvas.clientWidth || !canvas.clientHeight) return; renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); if (ready) resetView(); };
      const ro = new ResizeObserver(resize); ro.observe(canvas);
      const tick = () => { if (disposed) return; controls.update(); renderer.render(scene, camera); frame = visible ? requestAnimationFrame(tick) : 0; };
      const io = new IntersectionObserver((entries) => { visible = entries.at(-1)!.isIntersecting; if (visible && !frame) frame = requestAnimationFrame(tick); }); io.observe(canvas);

      const variants: Partial<Record<AssemblyStyle, Awaited<ReturnType<typeof loadAssembly>>>> = {};
      let current: Object3D | null = null;
      cleanup = () => { cancelAnimationFrame(frame); io.disconnect(); ro.disconnect(); controls.dispose(); Object.values(variants).forEach((v) => v?.dispose()); floor.geometry.dispose(); (floor.material as Material).dispose(); renderer.dispose(); };
      frame = requestAnimationFrame(tick);

      const show = async (s: AssemblyStyle) => {
        variants[s] ??= await loadAssembly(assembly, s);
        if (disposed) return;
        if (current) scene.remove(current);
        current = variants[s]!.group;
        scene.add(current);
      };
      await show("workshop");
      if (disposed) return;
      floor.position.y = 13;
      const box = new THREE.Box3().setFromObject(current!);
      const center = box.getCenter(new THREE.Vector3());
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      const direction = new THREE.Vector3(0.82, 0.48, 0.95).normalize();
      resetView = () => {
        const vertical = THREE.MathUtils.degToRad(camera.fov);
        const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
        const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.05;
        controls.target.copy(center);
        camera.position.copy(center).addScaledVector(direction, distance);
        controls.update();
      };
      applyStyle = (s) => { show(s).catch(() => (error = "Bu görünüm açılamadı.")); };
      ready = true;
      resize();
      loading = false;
    }
    start().catch(() => { if (!disposed) { error = "3D montaj açılamadı. Çizim sekmesini kullanabilir veya parça dosyalarını indirebilirsin."; loading = false; } });
    return () => { disposed = true; cleanup(); };
  });

  function pick(s: AssemblyStyle) { style = s; applyStyle(s); }
</script>

<div class="mv">
  <canvas bind:this={canvas} aria-label="{name}, döndürülebilir gerçek CAD montajı"></canvas>
  {#if loading}<div class="state" role="status"><span class="loader"></span>CAD montajı yükleniyor…</div>{/if}
  {#if error}<div class="state" role="alert">{error}</div>{/if}
  {#if !loading && !error}
    <div class="seg style" role="group" aria-label="3D renkleri">
      <button class:active={style === "workshop"} aria-pressed={style === "workshop"} onclick={() => pick("workshop")}>Atölye</button>
      <button class:active={style === "cad"} aria-pressed={style === "cad"} onclick={() => pick("cad")}>Baskı renkleri</button>
    </div>
    <div class="seg reset"><button onclick={() => resetView()}>Görünümü sıfırla</button></div>
  {/if}
</div>

<style>
  .mv { width: 100%; height: 100%; position: relative; min-height: 280px; }
  canvas { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  canvas:active { cursor: grabbing; }
  .state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 25px; font-size: 14px; color: #665c40; pointer-events: none; text-align: center; }
  .loader { height: 13px; width: 13px; border: 2px solid #e7d9a8; border-top-color: #8a6a12; border-radius: 50%; animation: spin 900ms linear infinite; }
  .style { position: absolute; top: 6px; left: 12px; }
  .reset { position: absolute; bottom: 8px; right: 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .loader { animation: none; } }
</style>
