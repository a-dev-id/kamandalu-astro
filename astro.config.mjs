// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://kamandaluresort.com",
  output: "static",
  outDir: "./public_html",
  i18n: {
    defaultLocale: "en",
    locales: ["en"], // only build English
  },
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
});
