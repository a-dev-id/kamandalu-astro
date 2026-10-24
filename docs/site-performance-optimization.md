# Kamandalu Ubud frontend performance report

23 October 2026. Implemented locally; no deployment or CMS changes.

**Measured outcome**

Image transfer across 34 matched, cold-cache responsive visits fell from **152.70 MB to 65.21 MB**, saving **87.49 MB (57.3%)**. This is the sum of repeated representative visits, including shared assets downloaded afresh in each browser context; it is not the size of one page or a sitewide unique-asset total. Homepage phone image transfer fell 43.4%; the first blog listing fell 94.9%.

The optimization reduces bandwidth, font bytes and render-blocking CSS. In the primary ten-run comparison, mobile Performance changed **63 → 66** and desktop **82 → 75**. The desktop decline is an observed result and has not been resolved into a proven first-party cause. Additional alternating and image-only diagnostics are included below. This is not an overall Lighthouse score win. No field Core Web Vitals or INP improvement is claimed.

**Implemented**

- Added a server-rendered supporting-image component and explicit layout profiles for villa cards, carousels, experiences, dining, wellness, weddings, offers, blog listings, section banners, thumbnails and lightboxes. Updated 15 route templates. This policy covers **639 supporting image tags** across EN/KO/ZH, representing **142 distinct source assets**: **594 responsive variants and 45 exact hero-asset reuses**. Gallery lightbox sources are also responsive (six items per language).
- Supporting photographs use Sanity width-only resizing, quality 80, automatic format negotiation and fit=max. Thumbnails use quality 78. Candidates stop at the available authored-crop width, and sizes account for current containers, gaps, columns, object-cover magnification and lightbox bounds. Queries preserve full crop/hotspot objects, dimensions and existing alt text. Unknown dimensions retain the original URL. The image builder runs during the Astro build and adds no browser hydration.
- Reused the completed Offer Carousel helper for equivalent card layouts. The Offer Carousel component/helper and its generated image tags remain unchanged.
- Reused protected hero originals for 45 supporting placements that share the exact same source on the same page and have no authored crop. Initial testing exposed an extra approximately 340 KB on Petulu when both hero originals and resized gallery copies downloaded. The correction restores Petulu's original transfer level and prevents the same duplication elsewhere. Hero tags and URLs are unchanged.
- Retained the small gallery lightbox images' intrinsic display size; a 330×200 original still displays at 330×200 at all tested viewport widths. Villa lightboxes retain their existing dimensions, controls and aspect ratios.
- Added losslessly compressed WOFF2 fonts with original TTF fallbacks, retaining font family, weight, style, display policy, glyph coverage and metrics. The regular body font is preloaded. All font tables were compared after decompression; only the WOFF2 container checksum/required lossless-repackaging flag differ.
- Consolidated local Splide CSS imports into the existing Base import. Homepage first-party CSS decreased **47,378 → 41,293 bytes**; gzip size **9,541 → 8,235 bytes** (computed for comparison), with one fewer stylesheet request. The external jsDelivr stylesheet/script are unchanged.
- Added intrinsic dimensions to the existing navigation logo without changing its file, URL, CSS size, quality or priority. Coalesced navbar scroll updates with requestAnimationFrame and guarded repeated style writes. In a controlled burst of 100 unchanged-state scroll events, class-toggle calls fell **1,900 → 0** at each tested width. This demonstrates less repeated work; it is not a measured page-load TBT reduction.

The local carousel runtime/options were retained: all five homepage carousels are used, and delaying mount can change provisional dimensions or visibility. There are no framework hydration islands to remove. Fonts and local CSS were improved without changing carousel initialization or excluded integrations.

Sanity parameters follow the [official image transformation reference](https://www.sanity.io/docs/apis-and-sdks/image-urls). Font conversion uses [fontTools WOFF2 support](https://fonttools.readthedocs.io/en/latest/ttLib/woff2.html); no fonts were subsetted.

**Measured image transfer**

Decimal MB, complete guided-scroll captures at 390px/DPR2 and 1440px/DPR1. The same script, scroll procedure, fresh contexts and enabled integrations were used. These totals include protected originals; they are not just sums of individually resized image estimates. Initial-load Lighthouse transfers differ because Lighthouse uses another viewport and does not perform this guided scroll. Network headers/negotiation introduce small variation.

| Page | Phone MB before → after (saved) | Desktop MB before → after (saved) |
| --- | --- | --- |
| / | 8.54 → 4.83 (43.4%) | 8.27 → 4.11 (50.4%) |
| /villas/ | 2.82 → 1.56 (44.9%) | 2.82 → 1.35 (52.0%) |
| /villa/garden-villa/ | 1.49 → 1.26 (15.4%) | 1.49 → 1.26 (15.5%) |
| /offers/ | 3.05 → 2.22 (27.2%) | 3.05 → 2.03 (33.5%) |
| /dining/ | 1.31 → 0.88 (33.2%) | 1.31 → 0.81 (38.2%) |
| /dining/petulu-restaurant/ | 0.71 → 0.71 (0.0%) | 0.71 → 0.71 (0.0%) |
| /spa-wellness/ | 2.46 → 2.24 (8.9%) | 2.46 → 2.03 (17.3%) |
| /unique-experiences/ | 1.31 → 0.87 (33.2%) | 1.31 → 0.80 (39.2%) |
| /ubud-experiences-and-activities/ | 2.30 → 1.30 (43.5%) | 2.30 → 1.23 (46.8%) |
| /ubud-experiences-and-activities/signature-experiences/ | 7.12 → 6.15 (13.7%) | 7.12 → 5.60 (21.4%) |
| /wedding-events/ | 2.31 → 2.19 (4.9%) | 2.31 → 1.81 (21.6%) |
| /wedding-event/ubud-wedding-venue-and-package/ | 1.17 → 1.16 (0.2%) | 1.16 → 1.16 (-0.0%) |
| /blog/ | 25.96 → 1.34 (94.9%) | 25.95 → 0.77 (97.0%) |
| /blog/2/ | 2.97 → 0.53 (82.2%) | 2.97 → 0.49 (83.6%) |
| /gallery/ | 2.93 → 0.48 (83.7%) | 2.93 → 0.51 (82.5%) |

The near-zero wedding-detail change reflects the currently published content, which supplies no package photographs in this template. Its supporting-image query/renderer is ready for those fields without altering its header. Smaller percentage gains on some pages reflect protected hero assets that remain in the totals.

Optimized responses were verified as AVIF and WebP in Chrome (263 AVIF and 78 WebP responses in the final capture set). The original hero JPEGs remain original JPEG requests. No source is requested above its available crop width. Existing small source files remain the resolution limit.

**Font file sizes**

| Existing font | TTF bytes | WOFF2 bytes |
| --- | ---: | ---: |
| MrEavesModOTBold.ttf | 67,776 | 26,888 |
| MrEavesModOTReg.ttf | 67,556 | 26,380 |
| Plantin.ttf | 26,488 | 14,140 |
| PlantinLight.ttf | 27,588 | 14,308 |

All four total **189,408 → 81,716 bytes** (56.9% less). The normally used regular body and light title faces total **95,144 → 40,688 bytes**, saving 54,456 bytes before response headers. Original TTF files are unchanged.

**Controlled Lighthouse comparison**

Recorded the existing production build and source hashes before editing. Both versions use Node 22.23.4, Astro 7.4.2, sitemap 3.7.4, the same installed dependencies, Chrome 155 and Lighthouse 12.8.2. Package/configuration hashes match. Both are served from the same localhost origin with the same no-cache static server. The server sends uncompressed HTML/CSS/JS; production hosting compression, TTFB and CDN behavior are not modeled.

Mobile: 412×823, DPR1.75, Lighthouse simulated slow 4G (150ms RTT, 1,638.4Kbps throughput), CPU multiplier 4. Desktop: 1350×940, DPR1, 40ms RTT, 10,240Kbps, CPU multiplier 1. Configurations are identical between versions. Every run uses a fresh Chrome profile. External scripts/configuration stay enabled and unchanged; no third-party blocking or response substitutions were performed.

There are **71 Lighthouse measurements**. The primary 56 consist of an initial five homepage measurements per device/version, eight mobile internal-page diagnostics per version, and another five homepage measurements per device/version alternating the two builds. Thus the primary comparison has **ten mobile and ten desktop homepage measurements per version**. Another 15 desktop runs compare baseline, supporting-images-only and full optimization five times each, rotating their order. Machine benchmark index and remote script completion still vary; the recorded ranges are material limits on causal conclusions.

All ten homepage measurements per device/version, medians:

| Metric | Mobile before → after | Desktop before → after |
| --- | --- | --- |
| Performance | 63 → 66 | 82 → 75 |
| LCP | 2.707 s → 2.556 s | 1.541 s → 1.968 s |
| TBT | 2706 ms → 2648 ms | 335 ms → 553 ms |
| CLS | 0.000000 → 0.000000 | 0.000000 → 0.000000 |
| Speed Index | 2.705 s → 2.257 s | 0.644 s → 0.698 s |
| FCP | 2.704 s → 2.132 s | 0.632 s → 0.616 s |

Alternating five-run comparison, medians:

| Metric | Mobile before → after | Desktop before → after |
| --- | --- | --- |
| Performance | 63 → 65 | 78 → 71 |
| LCP | 2.706 s → 2.704 s | 1.451 s → 2.401 s |
| TBT | 2979 ms → 2467 ms | 415 ms → 569 ms |
| CLS | 0.000000 → 0.000000 | 0.000000 → 0.000000 |
| Speed Index | 2.706 s → 2.307 s | 0.638 s → 0.666 s |
| FCP | 2.704 s → 2.299 s | 0.625 s → 0.613 s |

Alternating-set variability (IQR is the middle 50%):

| Version/device | Performance scores | Score IQR | TBT range |
| --- | --- | --- | --- |
| before mobile | 83, 66, 62, 61, 63 | 62–66 | 394–4680 ms |
| before desktop | 85, 74, 76, 79, 78 | 76–79 | 251–497 ms |
| after mobile | 70, 66, 39, 65, 63 | 63–66 | 1369–9380 ms |
| after desktop | 75, 54, 71, 78, 64 | 64–75 | 250–776 ms |

The machine benchmark-index ranges in that alternating set are mobile 502–3311 before / 959–2893 after; desktop 1303–2312 before / 1398–2345 after. Same settings do not eliminate host contention or live third-party variability. The report does not treat a median score difference as proof of a first-party cause.

**Desktop regression follow-up**

The images-only diagnostic replaces just the 27 supporting-image tags on the frozen baseline homepage. Its CSS, fonts, navigation/booking/carousel JavaScript, heroes and all tracking scripts remain baseline versions. This checks whether reverting the non-image optimizations removes the decline.

| Desktop variant (five runs) | Performance median (range) | LCP median | TBT median |
| --- | --- | --- | --- |
| Baseline | 86 (65–94) | 1.820 s | 43 ms |
| Supporting images only | 72 (52–92) | 3.671 s | 66 ms |
| Full optimization | 76 (66–97) | 1.916 s | 116 ms |

The image-only variant also records slower LCP, so the CSS/font/navigation changes are not a sufficient explanation. In the full optimization's final isolation run, Performance was 92 versus baseline 92, with TBT 23 versus 43 ms and LCP 1.916 versus 1.820 s. Other runs were worse. The measured desktop result remains mixed rather than a validated score improvement.

LCP breakdowns locate much of the variation in the **unchanged hero fetch**. In baseline isolation runs, the same aerial image's observed resource-loading duration ranged from about 347 to 2,225 ms. In the alternating desktop set, audit-listed same-origin script CPU ranged about 15–110 ms before and 18–108 ms after; external script CPU remained substantially larger. The protected LCP request stayed high priority; responsive supporting requests were already low priority. The data do not isolate an additional first-party scheduling change that can safely fix the desktop score while respecting the image/hero/integration requirements. These limits are reported explicitly rather than assigning all variation to tracking or reverting a verified transfer reduction on that assumption.

**Main-thread work and excluded integrations**

The highest script CPU contributors remain the existing Google tags and Meta scripts. In the alternating optimized mobile set, Lighthouse's third-party audit attributes these blocking times:

| Entity | Median audit blocking ms | Range ms |
| --- | ---: | ---: |
| Google Tag Manager | 1777 | 1071–5361 |
| Facebook | 1009 | 525–3154 |
| triptease.io | 177 | 111–761 |
| ContentSquare | 47 | 39–177 |

Largest script CPU costs (evaluation plus parse/compile, median ms; duplicate requests for the same Google tag ID grouped):

| Script | CPU ms |
| --- | ---: |
| https://www.googletagmanager.com/gtag/js?id=G-H09V6L9R0B | 1281 |
| https://connect.facebook.net/signals/config/1772152629691333 | 710 |
| https://www.googletagmanager.com/gtag/js?id=G-WRT2WJJ3E1 | 685 |
| https://connect.facebook.net/en_US/fbevents.js | 420 |
| https://onboard.triptease.io/bootstrap.js | 234 |
| https://www.googletagmanager.com/gtm.js?id=GTM-TNCVRTH5 | 224 |
| https://www.googletagmanager.com/gtm.js?id=GTM-PGV9J9LQ | 222 |

These audit attribution values are not additive portions of simulated TBT. [Lighthouse defines TBT](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time) from the blocking parts of long tasks between FCP and interactive readiness. Earlier paint, network scheduling and the location of unchanged script work within that window can change TBT. This metric explanation is not a proven causal attribution for an individual run.

No GTM, GA/GA4, Ads, Meta, Triptease, ContentSquare, booking, Vercel or jsDelivr integration was removed, delayed, blocked, reconfigured or optimized. Their source configuration/loading attributes are preserved. Significant remaining main-thread work cannot be removed under this task's integration exclusions. The first-party image helper is build-only, and local carousel initialization code/options remain intact.

**LCP findings**

Across all ten homepage measurements in each version, mobile selected the logo 10/10 before and 10/10 after. Desktop selected a hero 9/10 before and 8/10 after, and the logo in the remaining runs. Every measurement's selector and metrics are included in the JSON report and original Lighthouse JSON files.

The logo was already eagerly loaded with high priority and early discovery. Its file is unchanged; intrinsic dimensions now reserve its space. Protected hero resources, their priorities and slider behavior remain unchanged. Internal-page LCP can be dominated by these large originals, slider timing and existing main-thread script work. The image-transfer gains do not establish a guaranteed LCP reduction.

Single-run internal diagnostics (not statistically reliable before/after score comparisons):

| Page | Performance | LCP | TBT before → after |
| --- | --- | --- | --- |
| /en/villas/ | 46 → 40 | 10.089 s → 13.688 s | 1875 → 4243 ms |
| /en/villa/garden-villa/ | 45 → 41 | 15.543 s → 14.166 s | 2573 → 4217 ms |
| /en/ubud-experiences-and-activities/signature-experiences/ | 45 → 45 | 33.223 s → 8.925 s | 2127 → 3273 ms |
| /en/dining/petulu-restaurant/ | 47 → 42 | 8.781 s → 14.613 s | 1429 → 4250 ms |
| /en/spa-wellness/ | 50 → 45 | 5.839 s → 6.167 s | 1553 → 3513 ms |
| /en/wedding-events/ | 49 → 42 | 18.933 s → 17.129 s | 1281 → 4334 ms |
| /en/blog/ | 48 → 44 | 13.967 s → 6.774 s | 1472 → 3999 ms |
| /en/gallery/ | 50 → 46 | 6.754 s → 7.362 s | 1515 → 2290 ms |

**Validation and preservation**

- Final production build passed: **302 pages**, with the same route inventory. Existing 404 route-conflict warnings remain.
- **7/7 focused tests passed**: the three existing Offer Carousel tests plus supporting-image role, crop, no-upscale, fallback, thumbnail, lightbox and reuse checks. All four fonts passed decompressed-table comparisons.
- Compared every generated page: **687 protected hero image tags** match; SEO titles/meta, canonical/hreflang markup, structured data, visible text, link targets, external integration markup and compiled tracking modules match. Sitemaps, logo file, original TTFs, package files, Astro configuration and completed Offer Carousel source hashes match the baseline.
- **40 final responsive captures** cover 15 EN templates at phone/desktop widths, four tablet pages and six KO/ZH smoke visits. The 34 paired visits show no image-geometry differences above the defined subpixel tolerance and matching sampled heading/body typography. No broken loaded images or JavaScript page errors were found. Before/after homepage, villa and gallery captures were also reviewed visually; the existing gallery's build-time shuffle is retained.
- Navigation states/dropdowns, mobile menus, all five homepage carousel controls, villa gallery controls, gallery filtering/open/close, and wedding accordions were exercised at 390/820/1440px. Optimized modal dimensions match baseline. Date picker initializes a two-date range; adult/child controls and child-age fields work. Booking targets are unchanged; no booking transaction was submitted.
- No Sanity Studio/schema/published-document changes, deployment, dependency changes or design/content changes were made in this task. The pre-existing package.json/package-lock.json Git diff remains, but their hashes did not change during this work.

**Files changed in this task**

- `src/components/Navbar.astro`
- `src/layouts/Base.astro`
- `src/pages/[lang]/blog/[page].astro`
- `src/pages/[lang]/blog.astro`
- `src/pages/[lang]/dining/[slug].astro`
- `src/pages/[lang]/dining.astro`
- `src/pages/[lang]/gallery.astro`
- `src/pages/[lang]/index.astro`
- `src/pages/[lang]/offers.astro`
- `src/pages/[lang]/spa-wellness.astro`
- `src/pages/[lang]/ubud-experiences-and-activities/index.astro`
- `src/pages/[lang]/ubud-experiences-and-activities/[category].astro`
- `src/pages/[lang]/unique-experiences.astro`
- `src/pages/[lang]/villa/[slug].astro`
- `src/pages/[lang]/villas.astro`
- `src/pages/[lang]/wedding-event/[slug].astro`
- `src/pages/[lang]/wedding-events.astro`
- `src/styles/global.css`
- `src/components/SupportingImage.astro`
- `src/utils/supportingImages.js`

Additional files added:

- `public/fonts/MrEavesModOTReg.woff2`
- `public/fonts/MrEavesModOTBold.woff2`
- `public/fonts/Plantin.woff2`
- `public/fonts/PlantinLight.woff2`
- `scripts/compress-local-fonts.py`
- `scripts/supporting-images.test.mjs`
- `scripts/snapshot-site-performance.mjs`
- `scripts/benchmark-site.mjs`
- `scripts/benchmark-site-paired.mjs`
- `scripts/prepare-site-desktop-isolation.mjs`
- `scripts/benchmark-site-desktop-isolation.mjs`
- `scripts/check-site-browser.mjs`
- `scripts/check-site-interactions.mjs`
- `scripts/verify-site-output.mjs`
- `scripts/analyze-site-performance.mjs`
- `docs/site-performance-optimization.md`
- `docs/site-performance-results.json`

Prior Offer Carousel/investigation files are retained.

**Remaining limits and retention decision**

Retain the completed Offer Carousel optimization and the validated supporting-image/font/CSS/navigation changes. The transfer and asset-size reductions are measured, while an overall score/TBT improvement is not guaranteed by the evidence. Regressions caught during implementation—duplicate hero/support transfers and small-lightbox intrinsic sizing—were corrected before the final build.

Large protected hero assets and excluded integration work remain the main constraints. No further safe, measured first-party change was identified that justifies changing initialization/layout behavior. Future CSS layout changes should update the explicit sizes profiles. Quality 80/78 is the requested lossy supporting-photo policy; header/hero delivery retains its original quality.

The existing unused astro-carousel 3.0.2 package still declares an Astro ^5.1.7 peer and does not support the installed Astro 7 peer range. The site uses Splide instead. This pre-existing dependency issue was left unchanged, with no force install, upgrade or downgrade. The successful build does not resolve that peer declaration.

**Reproducing the local validation**

The standalone validation scripts use the existing isolated Lighthouse/Playwright tools under .cache/offer-carousel-tools (outside application dependencies) and the configured Chrome executable. Preserve .cache/site-performance/before; snapshot-site-performance.mjs refuses to overwrite it. Do not run the older Offer Carousel investigation runner for this task, since that earlier workflow contains blocking diagnostics.

Run the image tests with node --test scripts/offer-carousel-images.test.mjs scripts/supporting-images.test.mjs. Use npm run build, then verify-site-output.mjs, check-site-browser.mjs after and check-site-interactions.mjs after. Run benchmark-site.mjs before/after for the batch/internal diagnostics or benchmark-site-paired.mjs for the alternating homepage comparison. To reproduce the desktop isolation, run prepare-site-desktop-isolation.mjs followed by benchmark-site-desktop-isolation.mjs. Finish with analyze-site-performance.mjs. Run benchmarks alone; do not rebuild while serving a build under test.

Raw evidence, captures, build logs and all Lighthouse JSON files are in .cache/site-performance. The consolidated machine-readable report is [site-performance-results.json](site-performance-results.json). No production changes have been deployed.
