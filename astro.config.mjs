// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  outDir: "./public_html", // ✅ correct place
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
