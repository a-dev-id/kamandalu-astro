# Homepage hero WebP comparison

23 October 2026. Local visual test; not deployed.

**Result**

Lowered WebP quality after Q95 made every file larger. Tested all eight homepage hero assets, checking integer qualities in descending order until each WebP payload was no larger than its original JPG. The highest passing qualities are **Q78–Q84**. No resizing, new crops, sharpening, brightness or color adjustments were added.

Seven smaller WebPs are active locally. The aerial hero remains its original JPG because an unchanged supporting card also uses that exact original URL. Keeping it shared avoids downloading both JPG and WebP. All eight WebP candidates, including the aerial Q81 candidate, are available for visual comparison.

Current total hero payload: **2,784,528 → 2,741,334 bytes**, saving **43,194 bytes (1.55%)**. No active hero image is larger than before. The saving is modest; this is not evidence of a Lighthouse score improvement or deployment readiness.

**Per-image sizes**

Bytes are downloaded response bodies, excluding variable HTTP headers. Browser encoded transfer sizes and MIME observations are retained in the JSON evidence.

| Image | Original JPG bytes | Tested Q | Tested WebP bytes | Candidate saving bytes | Local homepage |
| --- | ---: | ---: | ---: | ---: | --- |
| 1. Kamandalu Aerial View | 374,460 | 81 | 366,018 | 8,442 | JPG retained |
| 2. Room Details | 377,985 | 82 | 375,798 | 2,187 | WebP applied |
| 3. Photo by melanie | 221,590 | 84 | 219,094 | 2,496 | WebP applied |
| 4. Forest Spa | 250,865 | 84 | 239,632 | 11,233 | WebP applied |
| 5. Forest Breakfast | 386,110 | 82 | 382,124 | 3,986 | WebP applied |
| 6. Awana Pool | 550,173 | 78 | 534,622 | 15,551 | WebP applied |
| 7. Lobby | 293,038 | 84 | 287,424 | 5,614 | WebP applied |
| 8. Wedding | 330,307 | 82 | 328,180 | 2,127 | WebP applied |

All eight candidate WebPs total 2,732,892 bytes, 51,636 bytes (1.85%) below the JPG total. The active seven-WebP/one-JPG mix saves 43,194 bytes. Converting the shared aerial as well would make the unchanged supporting card fetch its original JPG separately; that extra transfer would exceed the small candidate saving.

**Original Q95 test**

Your subsequent instruction to lower quality superseded the earlier Q95-only restriction. Q95 was rejected: every file increased, with a total of 4,957,428 bytes, **78.03% larger** than the JPGs.

| Image | JPG bytes | WebP Q95 bytes | Increase |
| --- | ---: | ---: | ---: |
| 1. Kamandalu Aerial View | 374,460 | 702,216 | +87.5% |
| 2. Room Details | 377,985 | 689,410 | +82.4% |
| 3. Photo by melanie | 221,590 | 408,962 | +84.6% |
| 4. Forest Spa | 250,865 | 430,034 | +71.4% |
| 5. Forest Breakfast | 386,110 | 669,726 | +73.5% |
| 6. Awana Pool | 550,173 | 969,822 | +76.3% |
| 7. Lobby | 293,038 | 500,280 | +70.7% |
| 8. Wedding | 330,307 | 586,978 | +77.7% |

**Resolution, source URLs and priorities**

All original assets are image/jpeg at **1920×1080**, and all tested WebPs decode at **1920×1080**. Existing HTML width=1600/height=900 attributes are layout/aspect hints, not a CDN resize; those attributes are unchanged. The first image remains loading=eager/fetchpriority=high; the remaining seven remain lazy/auto. Browser priority scheduling may promote visible images independently of these hints.

The original renderer uses the bare asset URL and CSS object-fit:cover with centered object-position. It does not apply authored Sanity image-object crop/hotspot transforms. None of these eight published images currently has an authored crop or hotspot. That behavior, including the existing mobile cover crop, remains unchanged. Conversion adds only fm=webp and the recorded q value to measured, known asset URLs. New/unmeasured assets and URLs with existing transforms retain their original delivery.

- **1. Kamandalu Aerial View**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/0396747df20f3b51e91c200a7c8deaf204a3f421-1920x1080.jpg), [tested WebP Q81](https://cdn.sanity.io/images/6go5cl4m/production/0396747df20f3b51e91c200a7c8deaf204a3f421-1920x1080.jpg?fm=webp&q=81). 1920×1080; eager/high; authored crop absent, hotspot absent.
- **2. Room Details**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77-1920x1080.jpg), [tested WebP Q82](https://cdn.sanity.io/images/6go5cl4m/production/c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77-1920x1080.jpg?fm=webp&q=82). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **3. Photo by melanie**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/83344bd07865c8c9443339e6bf6014e29f140fb7-1920x1080.jpg), [tested WebP Q84](https://cdn.sanity.io/images/6go5cl4m/production/83344bd07865c8c9443339e6bf6014e29f140fb7-1920x1080.jpg?fm=webp&q=84). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **4. Forest Spa**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/9a869f427ef1412b048323061859f8b121aa4235-1920x1080.jpg), [tested WebP Q84](https://cdn.sanity.io/images/6go5cl4m/production/9a869f427ef1412b048323061859f8b121aa4235-1920x1080.jpg?fm=webp&q=84). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **5. Forest Breakfast**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/a055687869c2518bb9c7f378e67c3e399265c19a-1920x1080.jpg), [tested WebP Q82](https://cdn.sanity.io/images/6go5cl4m/production/a055687869c2518bb9c7f378e67c3e399265c19a-1920x1080.jpg?fm=webp&q=82). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **6. Awana Pool**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/41b98180e6d7fbf067c999e9c8f2938132071d3c-1920x1080.jpg), [tested WebP Q78](https://cdn.sanity.io/images/6go5cl4m/production/41b98180e6d7fbf067c999e9c8f2938132071d3c-1920x1080.jpg?fm=webp&q=78). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **7. Lobby**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/c0e829a05fd45767cd6fe3cacbf4918694e2afa1-1920x1080.jpg), [tested WebP Q84](https://cdn.sanity.io/images/6go5cl4m/production/c0e829a05fd45767cd6fe3cacbf4918694e2afa1-1920x1080.jpg?fm=webp&q=84). 1920×1080; lazy/auto; authored crop absent, hotspot absent.
- **8. Wedding**: [original JPG](https://cdn.sanity.io/images/6go5cl4m/production/1d7d0211061006a0ff8e9c9c0ad1b6713e73a387-1920x1080.jpg), [tested WebP Q82](https://cdn.sanity.io/images/6go5cl4m/production/1d7d0211061006a0ff8e9c9c0ad1b6713e73a387-1920x1080.jpg?fm=webp&q=82). 1920×1080; lazy/auto; authored crop absent, hotspot absent.

Explicit format and quality are documented in the [Sanity image transformation reference](https://www.sanity.io/docs/apis-and-sdks/image-urls). There is one CDN WebP encoding from the existing JPG; files were not re-uploaded, locally re-encoded, resized or processed through additional lossy stages. WebP remains lossy.

**Visual comparison**

Open the [local comparison viewer](../.cache/homepage-hero-webp/review/index.html). It contains a reveal slider for every original/WebP pair, direct source-file links and native/detail/desktop/mobile side-by-side PNGs. Original Q95 evidence remains separately under .cache/homepage-hero-webp-q95.

- Native comparisons show each 1920×1080 image at 1:1 pixels.
- Detail comparisons show identical center and bottom-left 640×360 crops at 1:1 pixels, without sharpening or difference amplification.
- Desktop page screenshots use 1440×900 CSS pixels, DPR1. Mobile screenshots use 390×844 CSS pixels, DPR2.
- For synchronized page captures, only the exact first-party hero autoplay callback is omitted from the local comparison HTTP response for both versions. It is not changed in the application. Actual previous/next controls select matching positions, transitions complete, images decode and fonts finish loading before capture. All external scripts execute unchanged. A separate unmodified-page run verifies actual five-second autoplay.
- The aerial's native/detail pair shows tested Q81; its desktop/mobile pair correctly shows the original JPG retained in the actual local page.

All eight detail pairs were inspected. Color, brightness, composition and major edges remain close, with some additional fine-texture smoothing at 1:1. These are lossy conversions and are not pixel-identical. Per-image observations:

- **1. Kamandalu Aerial View:** Slight smoothing in dense foliage at 1:1; aerial buildings and color balance remain close. Original JPG retained in the actual page.
- **2. Room Details:** Subtle smoothing of fine leaves and curtain/fabric texture; glass, sunlight and overall color remain close.
- **3. Photo by melanie:** Fine shirt texture and water ripples are slightly smoother; yellow boat and skin tones remain close.
- **4. Forest Spa:** Background vegetation and linen texture soften slightly; framing, skin tones and bright wall gradients remain close.
- **5. Forest Breakfast:** Fine foliage and floor grain soften slightly; highlights, table edges and overall brightness remain close.
- **6. Awana Pool:** Most noticeable detail smoothing of the set in foliage and shadow texture at 1:1; pool color and composition remain close.
- **7. Lobby:** Minor softening in woven furniture/sculptural detail; neutral interior tones and geometry remain close.
- **8. Wedding:** Fine petals, vegetation and step texture soften slightly; warm backlighting and overall composition remain close.

The JSON records decoded RGB differences as supplementary measurements; they do not establish human perceptual equivalence. Given the approximately 43 KB active saving, the quality tradeoff is small in bandwidth value and should be judged from the local comparisons on your display.

**Validation**

- Final Astro production build passed: **302 pages**.
- **11 tests passed**, covering homepage URL selection/restoration, unknown/shared-source retention, and the existing Offer Carousel/supporting-image policies.
- Compared all generated pages: **21 hero src attributes changed** across EN/KO/ZH, three shared aerial hero tags stayed JPG, and **2,586 other image tags** match. Supporting-image optimizations and all other page headers are unchanged.
- SEO metadata, canonical/hreflang markup, structured data, links, script tags, external integration markup, compiled browser modules and runtime static assets match the baseline. An old generated public_html.zip archive was excluded from runtime-asset comparison because Astro clears/rebuilds the output folder; the frozen baseline retains that archive.
- Chrome verified **image/webp** for the seven active converted heroes on both desktop and mobile; the retained aerial verifies image/jpeg. All eight selected candidate downloads returned image/webp. Every selected candidate is at or below the original JPG payload; no larger candidate was applied.
- No broken hero images or JavaScript page errors in the captures. Desktop/mobile image bounds, cover behavior, object-position, HTML loading hints and intrinsic dimensions match.
- Previous/next controls and wraparound passed; actual autoplay advanced from slide 1 to slide 2 with no timer substitution. KO/ZH homepage smoke checks passed.
- No Sanity CMS changes, dependency changes, tracking/booking changes or deployment. GTM and every third-party script remain untouched.

**Files changed for this test**

- src/pages/[lang]/index.astro — imports the homepage-only URL helper and applies it only to homeSlider.image in the hero.
- src/utils/homepageHeroImages.js — measured per-asset quality choices, shared-JPG retention and one-switch restoration.
- scripts/homepage-hero-webp-audit.mjs
- scripts/homepage-hero-webp-select-quality.mjs
- scripts/homepage-hero-webp-browser.mjs
- scripts/homepage-hero-webp-compare.mjs
- scripts/homepage-hero-webp-verify.mjs
- scripts/homepage-hero-webp.test.mjs
- scripts/homepage-hero-webp-report.mjs
- docs/homepage-hero-webp-comparison.md
- docs/homepage-hero-webp-results.json

The existing broader site optimization changes were present before this task and are preserved. Only the homepage template changed among previously existing application sources; the new helper is scoped to this template.

**Restore original JPG delivery**

Set HOMEPAGE_HERO_WEBP_TEST to false in src/utils/homepageHeroImages.js and run npm run build. That restores all eight original hero URLs exactly without touching supporting images, other headers, tracking or CMS content. The local test is currently enabled. Nothing has been deployed.

Raw downloads, response sizes, tested qualities, synchronized screenshots and build logs are saved under .cache/homepage-hero-webp. Machine-readable results: [homepage-hero-webp-results.json](homepage-hero-webp-results.json).
