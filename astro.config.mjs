// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { getExperienceCanonicalUrl } from "./src/utils/experienceCanonicals.js";

const excludedErrorPages = new Set([
  '/en/404/',
  '/ko/404/',
  '/zh/404/',
  '/error/401/',
  '/error/403/',
  '/error/404/',
  '/error/500/',
]);

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
      filter: page => !excludedErrorPages.has(new URL(page).pathname)
        && getExperienceCanonicalUrl(page) === page,
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
});
