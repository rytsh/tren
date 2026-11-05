import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), svelte()],
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 700,
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: "three-core", test: /node_modules[\\/]three[\\/]build/ }, { name: "three-addons", test: /node_modules[\\/]three[\\/]examples/ }] } } },
  },
});
