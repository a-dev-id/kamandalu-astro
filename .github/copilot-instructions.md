# Kamandalu Resort - Astro Project Instructions

## Project Overview

This is a multilingual static website for Kamandalu Resort built with Astro 5, Sanity CMS, and Tailwind CSS 4. Content is fetched from Sanity at build time and deployed to Vercel with custom output directory `public_html/`.

## Architecture

### Multi-language Routing

All content pages use `[lang]` dynamic routing with supported languages: `en`, `ko`, `zh`.

**Key patterns:**

- Route structure: `src/pages/[lang]/page-name.astro` or `src/pages/[lang]/category/[slug].astro`
- Use `getLocale(lang)` from `src/utils/getLocale.js` to validate language param (defaults to `en`)
- All pages with `[lang]` param MUST export `getStaticPaths()` returning array of language params
- Root `/` redirects to `/en/` via `src/pages/index.astro` meta refresh

**Example getStaticPaths:**

```javascript
export async function getStaticPaths() {
  return ["en", "ko", "zh"].map((lang) => ({ params: { lang } }));
}
```

### Sanity CMS Integration

- Client: `src/lib/sanityClient.js` (projectId: `6go5cl4m`, dataset: `production`)
- Content types: `wellnessExperience`, `wellnessVenue`, `diningVenue`, villa types, offers, etc.
- Fetch pattern: Use locale parameter `$locale` in GROQ queries for translated fields
- Portable Text: Use `@portabletext/to-html` with custom components for rendering rich text

**Fetch example (see [spa-wellness/[slug].astro](src/pages/[lang]/spa-wellness/[slug].astro)):**

```javascript
const wellness = await client.fetch(
  `*[_type == "wellnessExperience" && slug.current == $slug][0]{
    title, "details": details[$locale], packages[]{ ... }
  }`,
  { slug, locale },
);
```

### Component Patterns

**OptimizedImage ([src/components/OptimizedImage.astro](src/components/OptimizedImage.astro)):**

- Wraps Sanity images with WebP optimization via URL params: `?w={width}&h={height}&q={quality}&fm=webp`
- Always use this instead of plain `<img>` for Sanity CDN images

**Base Layout ([src/layouts/Base.astro](src/layouts/Base.astro)):**

- Requires props: `title`, `description`, `url`, `ogImage`, `keywords`
- Includes global styles, Navbar, analytics (Vercel, GA4, GTM), and third-party scripts
- Already imports Splide CSS/JS and flatpickr stylesheets

**Navbar ([src/components/Navbar.astro](src/components/Navbar.astro)):**

- Fetches dining venues from Sanity for mega menu
- Uses `getStaticPaths()` for language support
- Logo adjusts on scroll (JavaScript in component)

### Translations

`src/i18n/translations.js` exports object with translation keys mapped to language codes. Access via `translations.keyName[locale]`.

## Build & Deploy

**Commands:**

- `npm run dev` - Dev server at localhost:4321
- `npm run build` - Build to `public_html/` directory
- `npm run preview` - Preview production build

**Critical config:**

- Output directory: `outDir: "./public_html"` in [astro.config.mjs](astro.config.mjs)
- Vercel redirects root `/` to `/en/` via [vercel.json](vercel.json)
- CSP headers configured in vercel.json for YouTube embeds, GTM, and Sanity CDN

## Development Conventions

**Creating new content pages:**

1. Add to `src/pages/[lang]/` with `[lang]` param
2. Export `getStaticPaths()` for all three languages
3. Use `getLocale(lang)` to get validated locale
4. Fetch Sanity content with `$locale` parameter
5. Wrap in `<Layout>` with full SEO props
6. Use `OptimizedImage` for Sanity images

**Handling dynamic slugs:**

- Fetch all slugs from Sanity in `getStaticPaths()`
- Use `languages.flatMap()` to generate paths for all language/slug combinations
- Example: [spa-wellness/[slug].astro](src/pages/[lang]/spa-wellness/[slug].astro) handles both `wellnessExperience` and `wellnessVenue` types

**Portable Text rendering:**
Define custom components for blocks, lists, and list items to match Tailwind styling. Use `safeArray()` helper to prevent errors on undefined arrays.

## Key Files

- [src/lib/sanityClient.js](src/lib/sanityClient.js) - Sanity CMS connection
- [src/utils/getLocale.js](src/utils/getLocale.js) - Language validation
- [src/i18n/translations.js](src/i18n/translations.js) - UI translations
- [src/layouts/Base.astro](src/layouts/Base.astro) - Main layout wrapper
- [src/components/OptimizedImage.astro](src/components/OptimizedImage.astro) - Image optimization
- [astro.config.mjs](astro.config.mjs) - Build config with custom outDir
- [vercel.json](vercel.json) - Deployment config with redirects and CSP

## Third-party Integrations

- Splide.js for carousels (loaded via CDN in Base.astro)
- Flatpickr for date pickers (async loaded)
- Vercel Analytics & Speed Insights
- Google Analytics 4 (G-H09V6L9R0B)
- Google Tag Manager (GTM-T3K8HB3X)
- Hotjar/ContentSquare tracking
