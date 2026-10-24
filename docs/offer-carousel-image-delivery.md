# Phase 1: homepage Offer Carousel image delivery

Completed locally on 23 October 2026. The homepage Offer Carousel now serves responsive Sanity WebP/AVIF images at quality 80. Measured carousel transfer reductions are 72.8–95.9% across the main desktop/mobile checks. Headers, heroes, CMS content, and carousel design remain unchanged. Nothing was deployed.

## Inspection recorded before implementation

- Scope: only the Offer Carousel in `src/pages/[lang]/index.astro` (`#offer-carousel-list` is assigned by Splide at runtime).
- Data: homepage GROQ fetches published `offer` documents ordered by `orderNumber`, selecting `mainImage { asset->{url} }` and localized `mainImageAlt`. It does not use `secondImage`.
- Delivery: `OptimizedImage.astro` forwards the original URL unchanged. Despite its name (and outdated repository guidance), it does not transform images. There is no installed `@sanity/image-url`, `srcset`, or `sizes`.
- Existing offer markup: width 800, height 600, `loading="lazy"`, `fetchpriority="auto"`, and `object-cover w-full h-auto aspect-[4/3] md:aspect-[3/2] transition duration-500`. Preserve these dimensions and classes so layout and object alignment stay unchanged.
- The seven currently published offer assets are all 1920 × 1080 JPEGs, with no authored crop or hotspot metadata. Direct asset URLs ignore any future crop/hotspot settings.
- Layout: Tailwind container with horizontal padding 16px, 40px from 1280px, and zero from 1536px. Splide displays one card through 768px, two through 1024px, and three above 1024px. Gap is 32px through 1366px, then 64px.
- Loading: offers follow the full-screen hero, introduction, and villa carousel. They are below the initial viewport and already lazy-loaded on mobile and desktop.
- Shared component: `OptimizedImage.astro` also renders homepage hero slides and page headers. Its implementation and defaults must remain unchanged.
- Role protection: the same offer `mainImage` can be the header fallback in `src/pages/[lang]/offer/[slug].astro`. Optimize only its supporting-image rendering on the homepage; do not modify that detail-page query or header rendering. Homepage `homeSlider.image`, all `headerImages[].image`, and every other rendering remain on their current delivery paths.
- Baseline production build: passed, 302 pages. Existing warnings report conflicting `/en/404`, `/ko/404`, and `/zh/404` routes. No test script or existing test suite is configured in `package.json`.

## Measurement method

Baseline is the unchanged local production build at `http://127.0.0.1:4321/en/`. All 302 generated HTML documents were captured before editing. Browser checks use installed Chrome with fresh contexts and disabled browser caching; scroll to offers and traverse every slide before recording image transfer sizes. Lighthouse uses its default mobile performance configuration, five runs per version, on the same URL. Raw results and screenshots are retained locally under `.cache/offer-carousel/` (ignored by Git).

## Implementation

- Added a dedicated `OfferCarouselImage.astro` and `offerCarouselImages.js` policy; the shared `OptimizedImage.astro` is unchanged.
- Only the homepage offers projection now includes the complete image object plus asset ID, URL, and dimension metadata. No other GROQ projection changed.
- Added `@sanity/image-url` to generate `w`, `auto=format`, `q=80`, and `fit=max` URLs. Width-only resizing preserves source/crop proportions; the complete image retains crop/hotspot metadata and no focal-point override is applied.
- Width candidates: 320, 480, 640, 800, 960, 1280, 1536, 1760. The larger candidates support the unusually wide single-card tablet breakpoint at high pixel density. Every candidate is capped to the actual cropped source width; duplicates are removed. Unknown dimensions fall back to the existing URL without a misleading `srcset`.
- `sizes` follows the measured container, padding, gaps, and cards per row. It also accounts for `object-cover`: a 16:9 source needs more pixels to fill the existing 4:3 / 3:2 card. This retains sharpness without changing composition or CSS. No 1920px candidate is offered.
- Retained width 800, height 600, all image classes, localized alt resolution, lazy loading, and automatic fetch priority. Added `decoding="async"`. Navigation, transitions, links, typography, spacing, and layout are unchanged.

### Measured existing card layout

| Viewport width | Card width | Card height |
| ---: | ---: | ---: |
| 390 | 358 | 268.50 |
| 768 | 736 | 490.66 |
| 820 | 352 | 234.66 |
| 1024 | 480 | 320.00 |
| 1280 / 1366 | 378.66 | 252.44 |
| 1440 | 357.33 | 238.22 |
| 1920 | 469.33 | 312.88 |

All initial carousel positions measured below the viewport: 2367–2880px from the top, depending on viewport dimensions. Lazy loading remains appropriate, although Chrome's preload distance can still load the images before they are visible.

## CDN verification

All 56 responsive URLs (seven images × eight widths) were fetched with modern image Accept headers using Playwright's request client. These responses were `image/webp`, and their decoded pixel widths match every `srcset` descriptor. Actual Chrome image requests delivered `image/avif` across the main desktop/mobile checks, with both WebP and AVIF observed in the additional 640px high-density check. Original asset URLs still return 1920 × 1080 JPEGs. No original asset or CMS record was changed.

Total response-body bytes for all seven images, excluding HTTP headers:

| Source width | Format | Bytes | Reduction from original |
| ---: | --- | ---: | ---: |
| 1920 (original) | JPEG | 2,644,270 | — |
| 480 | WebP | 146,604 | 94.5% |
| 640 | WebP | 270,020 | 89.8% |
| 800 | WebP | 399,434 | 84.9% |
| 960 | WebP | 512,176 | 80.6% |
| 1280 | WebP | 1,020,076 | 61.4% |
| 1536 | WebP | 1,387,378 | 47.5% |
| 1760 | WebP | 1,734,134 | 34.4% |

## Browser results

Cold browser response transfer bytes, including protocol overhead, after scrolling to offers and traversing all seven slides:

| Viewport / pixel density | Selected width | Before: JPEG bytes | After: AVIF bytes | Reduction |
| --- | ---: | ---: | ---: | ---: |
| Mobile 390px / 1× | 480 | 2,644,911 | 108,074 | 95.9% |
| Mobile 390px / 2× | 960 | 2,646,166 | 380,371 | 85.6% |
| Tablet 768px / 1× | 960 | 2,644,895 | 379,445 | 85.7% |
| Tablet 820px / 2× | 960 | 2,646,588 | 379,959 | 85.6% |
| Desktop 1440px / 1× | 480 | 2,647,050 | 107,991 | 95.9% |
| Desktop 1440px / 2× | 960 | 2,644,892 | 380,221 | 85.6% |
| Desktop 1920px / 2× | 1280 | 2,647,051 | 719,076 | 72.8% |

Additional high-density tablet checks confirm that 608px and 736px single cards select 1760px sources at 2×, rather than stretching a 960px source. Transfer totals were 1,435,770 bytes (mixed AVIF/WebP, 640px viewport) and 1,239,831 bytes (AVIF, 768px viewport).

All ten paired viewport/density measurements retained exactly the same card dimensions and alt text. Original/optimized images were visually reviewed at 1× and 2×: composition and colors remain consistent; resizing and lossy quality-80 encoding reduce fine texture detail compared with the original. Screenshots are in `.cache/offer-carousel/{before,after,cdn}/`.

The first rapid-click sweep had inconsistent final button states at 1024px. A controlled comparison using identical current scripts with original versus optimized image tags, normal button clicks, and 1600ms waits passed at 390, 768, 1024, and 1440px: identical active slides, track transforms, and links after next/next/previous/previous. Navigation source code was not changed.

## Protection and validation

- Final `npm run build`: passed; 302 pages generated in 3m 54s. Existing 404 route conflict warnings remain.
- `node --test scripts/offer-carousel-images.test.mjs`: 3 tests passed (CDN policy, small/cropped sources without upscaling or mutation, missing-metadata fallback). There is no existing configured test suite.
- Generated HTML comparison: 299 non-homepage documents retain identical image tags (gallery image ordering is nondeterministic); all 117 other image tags across the three localized homepages remain unchanged. Only the 21 offer image tags changed.
- All header/hero URLs, dimensions, loading/fetch priority, and styling remain unchanged, including offer-detail `mainImage` hero fallbacks. The shared component and all header/hero source files are untouched.
- SEO tags, canonical links, and structured data match the baseline in all 302 documents.
- `git diff --check`: passed.
- No deployment, Sanity mutation, re-upload, other image optimization, or unrelated UI change was performed.

## Files changed

- `src/pages/[lang]/index.astro`: dedicated offer-image component and minimal offer-image metadata projection.
- `src/components/OfferCarouselImage.astro`: isolated supporting-image rendering.
- `src/utils/offerCarouselImages.js`: responsive CDN policy and crop-aware resolution limits.
- `scripts/offer-carousel-images.test.mjs`: focused image-delivery checks.
- `package.json` / `package-lock.json`: add the Sanity image builder and its locked dependencies.
- `docs/offer-carousel-image-delivery.md`: inspection, measurements, verification, and limitations.
- `docs/offer-carousel-benchmark.json`: compact measured results for review.

## Remaining issues and limits

- The working tree also contains separate Astro (`^7.4.2`) and sitemap (`^3.7.4`) updates that appeared during the session; these were preserved. The compiler output changed whitespace across pages. This prevents attributing whole-page Lighthouse score changes solely to the carousel; the directly measured offer-image savings remain valid.
- The existing `astro-carousel@3.0.2` peer range requires Astro 5, while the project currently uses Astro 7. The image-builder install needed `--legacy-peer-deps`; the lockfile was subsequently normalized with `--package-lock-only --force`. The existing version mismatch was not changed.
- Gallery image order changes between builds due to the existing query. Image URL/attribute comparisons account for that order variation; no gallery source was changed.
- Live third-party scripts remain enabled in both Lighthouse batches, so blocking time and total page bytes vary. Measurements are local lab results, not production field data. No carousel image was identified as LCP (the sampled Lighthouse LCP node is the unchanged navigation logo).
- Format negotiation can vary by request headers and browser; WebP and AVIF were both verified. Quality 80 is lossy, so results preserve design and composition rather than pixel identity with the original JPEG.
- Stop here: Phase 1 covers the homepage Offer Carousel only. Nothing was deployed.

CDN policy reference: [Sanity image transformations](https://www.sanity.io/docs/apis-and-sdks/image-urls) and [Sanity image URL builder](https://github.com/sanity-io/image-url).

## Lighthouse comparison

Five runs per version, same local URL and installed headless Chrome 155, Lighthouse 12.8.2. Default mobile emulation: 412 × 823, device pixel ratio 1.75, simulated network throttling (150ms RTT / 1638.4kbps), CPU slowdown 4×. Third-party scripts were left enabled. Values below are medians; MB means decimal megabytes.

| Metric | Before | After |
| --- | ---: | ---: |
| Performance score | 64 | 58 |
| LCP | 2.706 s | 2.715 s |
| TBT | 1,789.5 ms | 3,512.5 ms |
| CLS | 0 | 0 |
| Total transferred image bytes | 8,224,102 | 5,957,024 |
| Offer Carousel image transfer bytes | 2,647,793 | 380,733 |
| Total page transfer bytes | 10,087,451 | 7,671,874 |

The carousel transferred **85.6% fewer bytes** in Lighthouse, and total image transfer fell by about 2.27 MB. The overall score declined and TBT increased; these runs do **not** establish a whole-page performance-score improvement. LCP was essentially unchanged and median CLS stayed zero. Dependency/compiler changes and variable third-party work limit attribution of score/TBT differences.

| Run | Before score | After score | Before LCP (ms) | After LCP (ms) | Before TBT (ms) | After TBT (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 61 | 65 | 2704 | 2706 | 1789.5 | 1895 |
| 2 | 60 | 33 | 3007 | 10648 | 3576 | 3512.5 |
| 3 | 68 | 58 | 2706 | 2559 | 1341.5 | 4828 |
| 4 | 71 | 60 | 2706 | 2715 | 902.5 | 2652 |
| 5 | 64 | 55 | 2708 | 3008 | 2177 | 5305 |

One after-run had a 10.65s LCP outlier; it was retained. No Lighthouse runs were discarded. These results establish smaller carousel transfers, not a reliable LCP/TBT improvement. Further components and unrelated performance work remain outside Phase 1.
