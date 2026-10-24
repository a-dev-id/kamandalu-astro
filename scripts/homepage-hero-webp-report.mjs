import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const root='.cache/homepage-hero-webp';
const read=file=>JSON.parse(readFileSync(file));
const baseline=read(`${root}/baseline.json`);
const originalQ95=read('.cache/homepage-hero-webp-q95/baseline.json');
const comparisons=read(`${root}/comparison.json`);
const before=read(`${root}/before/browser.json`),after=read(`${root}/after/browser.json`);
const verification=read(`${root}/verification.json`),autoplay=read(`${root}/after/autoplay.json`);
assert.deepEqual(verification.failures,[]);assert.deepEqual(after.errors,[]);
const assessments=[
  'Slight smoothing in dense foliage at 1:1; aerial buildings and color balance remain close. Original JPG retained in the actual page.',
  'Subtle smoothing of fine leaves and curtain/fabric texture; glass, sunlight and overall color remain close.',
  'Fine shirt texture and water ripples are slightly smoother; yellow boat and skin tones remain close.',
  'Background vegetation and linen texture soften slightly; framing, skin tones and bright wall gradients remain close.',
  'Fine foliage and floor grain soften slightly; highlights, table edges and overall brightness remain close.',
  'Most noticeable detail smoothing of the set in foliage and shadow texture at 1:1; pool color and composition remain close.',
  'Minor softening in woven furniture/sculptural detail; neutral interior tones and geometry remain close.',
  'Fine petals, vegetation and step texture soften slightly; warm backlighting and overall composition remain close.',
];
const totals={original:0,webpCandidates:0,active:0,q95:0};
for(const image of baseline.images){
  assert.ok(image.variants.webp.bytes<=image.variants.original.bytes);
  assert.ok(image.tested.filter(test=>test.quality>image.quality).every(test=>test.bytes>image.variants.original.bytes));
  assert.ok(existsSync(`${root}/comparison/${image.name}-desktop-side-by-side.png`));
  assert.ok(existsSync(`${root}/comparison/${image.name}-mobile-side-by-side.png`));
  totals.original+=image.variants.original.bytes;
  totals.webpCandidates+=image.variants.webp.bytes;
  totals.active+=image.variants[image.keepOriginal?'original':'webp'].bytes;
  totals.q95+=originalQ95.images[image.index].variants['webp-q95'].bytes;
}
const geometryIssues=[];
for(const capture of after.captures){
  const previous=before.captures.find(c=>c.device===capture.device&&c.index===capture.index);
  if(JSON.stringify(previous.box)!==JSON.stringify(capture.box)||previous.fit!==capture.fit||previous.position!==capture.position)geometryIssues.push(capture);
  const expectedMime=baseline.images[capture.index].keepOriginal?'image/jpeg':'image/webp';
  assert.equal(capture.network.mime,expectedMime);
}
assert.deepEqual(geometryIssues,[]);
const images=baseline.images.map(image=>({...image,assessment:assessments[image.index],comparison:comparisons.find(c=>c.index===image.index),q95:originalQ95.images[image.index].variants['webp-q95']}));
const result={date:new Date().toISOString(),totals,activeSavings:totals.original-totals.active,activeSavingsPercent:100*(totals.original-totals.active)/totals.original,images,verification,autoplay,geometryIssues,beforeCaptures:before.captures,afterCaptures:after.captures,errors:after.errors};
writeFileSync('docs/homepage-hero-webp-results.json',JSON.stringify(result,null,2));
const number=n=>n.toLocaleString('en-US');
const rows=images.map(image=>`| ${image.index+1}. ${image.title.en} | ${number(image.variants.original.bytes)} | ${image.quality} | ${number(image.variants.webp.bytes)} | ${number(image.variants.original.bytes-image.variants.webp.bytes)} | ${image.keepOriginal?'JPG retained':'WebP applied'} |`).join('\n');
const q95Rows=images.map(image=>`| ${image.index+1}. ${image.title.en} | ${number(image.variants.original.bytes)} | ${number(image.q95.bytes)} | +${((image.q95.bytes/image.variants.original.bytes-1)*100).toFixed(1)}% |`).join('\n');
const urls=images.map(image=>`- **${image.index+1}. ${image.title.en}**: [original JPG](${image.variants.original.url}), [tested WebP Q${image.quality}](${image.variants.webp.url}). ${image.originalResolution.width}×${image.originalResolution.height}; ${image.loading}/${image.fetchpriority}; authored crop ${image.authoredCrop?'present':'absent'}, hotspot ${image.authoredHotspot?'present':'absent'}.`).join('\n');
const visuals=images.map(image=>`- **${image.index+1}. ${image.title.en}:** ${image.assessment}`).join('\n');
const text=`# Homepage hero WebP comparison

23 October 2026. Local visual test; not deployed.

**Result**

Lowered WebP quality after Q95 made every file larger. Tested all eight homepage hero assets, checking integer qualities in descending order until each WebP payload was no larger than its original JPG. The highest passing qualities are **Q78–Q84**. No resizing, new crops, sharpening, brightness or color adjustments were added.

Seven smaller WebPs are active locally. The aerial hero remains its original JPG because an unchanged supporting card also uses that exact original URL. Keeping it shared avoids downloading both JPG and WebP. All eight WebP candidates, including the aerial Q81 candidate, are available for visual comparison.

Current total hero payload: **${number(totals.original)} → ${number(totals.active)} bytes**, saving **${number(totals.original-totals.active)} bytes (${result.activeSavingsPercent.toFixed(2)}%)**. No active hero image is larger than before. The saving is modest; this is not evidence of a Lighthouse score improvement or deployment readiness.

**Per-image sizes**

Bytes are downloaded response bodies, excluding variable HTTP headers. Browser encoded transfer sizes and MIME observations are retained in the JSON evidence.

| Image | Original JPG bytes | Tested Q | Tested WebP bytes | Candidate saving bytes | Local homepage |
| --- | ---: | ---: | ---: | ---: | --- |
${rows}

All eight candidate WebPs total ${number(totals.webpCandidates)} bytes, ${number(totals.original-totals.webpCandidates)} bytes (${(100*(totals.original-totals.webpCandidates)/totals.original).toFixed(2)}%) below the JPG total. The active seven-WebP/one-JPG mix saves ${number(totals.original-totals.active)} bytes. Converting the shared aerial as well would make the unchanged supporting card fetch its original JPG separately; that extra transfer would exceed the small candidate saving.

**Original Q95 test**

Your subsequent instruction to lower quality superseded the earlier Q95-only restriction. Q95 was rejected: every file increased, with a total of ${number(totals.q95)} bytes, **${((totals.q95/totals.original-1)*100).toFixed(2)}% larger** than the JPGs.

| Image | JPG bytes | WebP Q95 bytes | Increase |
| --- | ---: | ---: | ---: |
${q95Rows}

**Resolution, source URLs and priorities**

All original assets are image/jpeg at **1920×1080**, and all tested WebPs decode at **1920×1080**. Existing HTML width=1600/height=900 attributes are layout/aspect hints, not a CDN resize; those attributes are unchanged. The first image remains loading=eager/fetchpriority=high; the remaining seven remain lazy/auto. Browser priority scheduling may promote visible images independently of these hints.

The original renderer uses the bare asset URL and CSS object-fit:cover with centered object-position. It does not apply authored Sanity image-object crop/hotspot transforms. None of these eight published images currently has an authored crop or hotspot. That behavior, including the existing mobile cover crop, remains unchanged. Conversion adds only fm=webp and the recorded q value to measured, known asset URLs. New/unmeasured assets and URLs with existing transforms retain their original delivery.

${urls}

Explicit format and quality are documented in the [Sanity image transformation reference](https://www.sanity.io/docs/apis-and-sdks/image-urls). There is one CDN WebP encoding from the existing JPG; files were not re-uploaded, locally re-encoded, resized or processed through additional lossy stages. WebP remains lossy.

**Visual comparison**

Open the [local comparison viewer](../.cache/homepage-hero-webp/review/index.html). It contains a reveal slider for every original/WebP pair, direct source-file links and native/detail/desktop/mobile side-by-side PNGs. Original Q95 evidence remains separately under .cache/homepage-hero-webp-q95.

- Native comparisons show each 1920×1080 image at 1:1 pixels.
- Detail comparisons show identical center and bottom-left 640×360 crops at 1:1 pixels, without sharpening or difference amplification.
- Desktop page screenshots use 1440×900 CSS pixels, DPR1. Mobile screenshots use 390×844 CSS pixels, DPR2.
- For synchronized page captures, only the exact first-party hero autoplay callback is omitted from the local comparison HTTP response for both versions. It is not changed in the application. Actual previous/next controls select matching positions, transitions complete, images decode and fonts finish loading before capture. All external scripts execute unchanged. A separate unmodified-page run verifies actual five-second autoplay.
- The aerial's native/detail pair shows tested Q81; its desktop/mobile pair correctly shows the original JPG retained in the actual local page.

All eight detail pairs were inspected. Color, brightness, composition and major edges remain close, with some additional fine-texture smoothing at 1:1. These are lossy conversions and are not pixel-identical. Per-image observations:

${visuals}

The JSON records decoded RGB differences as supplementary measurements; they do not establish human perceptual equivalence. Given the approximately 43 KB active saving, the quality tradeoff is small in bandwidth value and should be judged from the local comparisons on your display.

**Validation**

- Final Astro production build passed: **302 pages**.
- **11 tests passed**, covering homepage URL selection/restoration, unknown/shared-source retention, and the existing Offer Carousel/supporting-image policies.
- Compared all generated pages: **21 hero src attributes changed** across EN/KO/ZH, three shared aerial hero tags stayed JPG, and **2,586 other image tags** match. Supporting-image optimizations and all other page headers are unchanged.
- SEO metadata, canonical/hreflang markup, structured data, links, script tags, external integration markup, compiled browser modules and runtime static assets match the baseline. An old generated public_html.zip archive was excluded from runtime-asset comparison because Astro clears/rebuilds the output folder; the frozen baseline retains that archive.
- Chrome verified **image/webp** for the seven active converted heroes on both desktop and mobile; the retained aerial verifies image/jpeg. All eight selected candidate downloads returned image/webp. Every selected candidate is at or below the original JPG payload; no larger candidate was applied.
- No broken hero images or JavaScript page errors in the captures. Desktop/mobile image bounds, cover behavior, object-position, HTML loading hints and intrinsic dimensions match.
- Previous/next controls and wraparound passed; actual autoplay advanced from slide ${autoplay.first+1} to slide ${autoplay.next+1} with no timer substitution. KO/ZH homepage smoke checks passed.
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
`;
writeFileSync('docs/homepage-hero-webp-comparison.md',text);
console.log(JSON.stringify({totals,activeSavings:result.activeSavings,activeSavingsPercent:result.activeSavingsPercent,verificationFailures:verification.failures,geometryIssues,errors:after.errors},null,2));
