# Offer Carousel performance investigation

Investigation date: 23 October 2026 (Asia/Singapore). Scope: explain the Phase 1 Lighthouse regression, measure the image-delivery change in isolation, and recommend next steps. No website optimization, dependency change, CMS mutation, deployment, or production tracking change is part of this investigation.

**Conclusion:** retain Phase 1. The controlled comparison did not reproduce the earlier score drop or large TBT increase. The strongest evidence points to third-party execution, unstable host performance, and autoplay-sensitive visual measurement as contributors to the old batches' differences. The exact historical effect of every uncontrolled variable cannot be recovered. Tracking/third-party work is the priority for improving TBT; Phase 2 can be considered separately for bandwidth savings.

## Findings from the previous ten reports

The original comparison did not isolate the image policy: Astro and sitemap dependency edits appeared during the earlier session, and the two batches had substantial host/script variability. The observed score decrease is real for those batches, but it is not evidence that reducing carousel image bytes caused the regression.

| Metric, median of five runs | Previous original | Previous optimized |
| --- | ---: | ---: |
| Performance score | 64 | 58 |
| LCP | 2,705.6 ms | 2,714.8 ms |
| TBT | 1,789.5 ms | 3,512.5 ms |
| Speed Index | 2,706.5 ms | 5,832.2 ms |
| FCP | 2,629.4 ms | 2,707.7 ms |
| Lighthouse host benchmark index | 3,133.5 | 1,431.5 |

Speed Index was absent from the previous summary and explains an important part of the score change. In the saved Lighthouse configuration, TBT carries 30% of the score and Speed Index 10%; transferred bytes are not a directly scored metric. The median metric-score contribution changed from 3.0 to 0.3 points for TBT and from 9.6 to 4.9 points for Speed Index. Median contributions do not sum to the median overall score. See [Chrome's scoring documentation](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

The host benchmark index varied substantially and was much lower in the old optimized batch. It is an indicator that execution conditions were not stable; it is not a calibrated factor for converting these TBT results. The old optimized batch also spent more CPU time across multiple unchanged third-party scripts. Neither fact establishes a dependency regression or an image-decoding regression.

### Third-party work in the previous batches

| Lighthouse entity | Before median CPU | After median CPU | Before attributed blocking | After attributed blocking |
| --- | ---: | ---: | ---: | ---: |
| Google Tag Manager / Google tags | 1,566 ms | 2,802 ms | 1,031 ms | 2,237 ms |
| Facebook / Meta Pixel | 710 ms | 1,281 ms | 495 ms | 1,059 ms |
| Triptease | 493 ms | 674 ms | 139 ms | 228 ms |
| ContentSquare | 71 ms | 174 ms | 13 ms | 102 ms |

These are Lighthouse audit CPU/blocking estimates over their respective analysis windows, not a partition of the displayed simulated TBT. Do not sum or subtract them as though their timing windows were identical. [TBT counts only the blocking portion beyond 50ms of long tasks in its measurement window.](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time)

The old reports' largest individual Google workloads include `gtag/js` destinations `AW-17391025599`, `AW-400578053`, `AW-17389219279`, destination `AW-789859065`, and GA4 IDs `G-WRT2WJJ3E1` / `G-H09V6L9R0B`. Meta's `fbevents.js` and `signals/config/1772152629691333` also produce long tasks. The small GTM container bootstrap scripts are not the entire cost: they and other integrations can cause much larger downstream tag execution.

### Visual-timing variance

Saved filmstrips show the first hero image in a short before-run and the second hero image in longer after-runs. The source has an unchanged five-second autoplay timer and one-second opacity transition. Most old before-runs ended their visual timeline before that automatic slide change; four of five old after-runs captured late visual changes. [Speed Index measures visual progression across captured frames](https://developer.chrome.com/docs/lighthouse/performance/speed-index), so crossing the autoplay boundary can materially change it without a change to the page design or initial hero delivery. This is an evidence-backed contributor to variability, not proof that every late pixel change came exclusively from autoplay.

## Controlled comparison method

- Use one existing, frozen production build: Astro 7.4.2, sitemap 3.7.4, Splide 4.1.4, image URL builder 2.1.1, Node 22.23.4, Lighthouse 12.8.2, installed headless Chrome 155.
- The optimized version is the untouched current production HTML. The original-delivery version substitutes only the seven offer `<img>` tags recorded before Phase 1 into that same document. This tests the complete rendering delta (original `src` versus responsive sources and async decoding), not a reconstruction of the previous dependency tree.
- Assertions confirm byte-identical scripts, link tags, non-offer images, and HTML outside those seven tags. Both variants request exactly the same JS/CSS files; SHA-256 hashes are recorded for all build assets, website source files, dependency manifests, and configuration.
- Both variants use the same local URL, server, current CMS snapshot, headers, browser executable, mobile viewport (412 × 823, DPR 1.75), and Lighthouse simulated slow-4G / CPU slowdown 4× settings.
- Ten cold-browser runs per version with tracking enabled. Interleave original/optimized in AB/BA order to reduce time/order bias. Each run has a new Chrome profile. No simultaneous browser benchmark is run.
- Five additional runs per version block tracking/advertising domains using Lighthouse's local `blockedUrlPatterns` option. Local scripts, Sanity images, and functional jsDelivr libraries remain available. Website source and production tracking are unchanged.
- Retain every successful run and report medians, quartiles, full ranges, and exploratory paired bootstrap intervals. Nominal network/CPU settings are fixed, but external networks, remote tag responses, and host load cannot be made perfectly constant; record their variability rather than treating these as noise-free results.
- Raw Lighthouse JSON, compressed traces, and DevTools network logs are saved under `.cache/offer-investigation/raw/`. The reproducible runner is `scripts/investigate-offer-performance.mjs`; the analyzer is `scripts/analyze-offer-performance.mjs`. They use the isolated tools already installed during Phase 1 and do not install packages.

## Dependency and JavaScript source inspection

`astro-carousel@3.0.2` declares an Astro `^5.1.7` peer dependency; installed Astro 7.4.2 does not satisfy that range. No project source imports `astro-carousel`. The homepage's actual carousel library is `@splidejs/splide@4.1.4`. The peer mismatch is an installation/maintenance risk, but there is no `astro-carousel` homepage execution to explain the measured blocking regression. A future removal of the unused package is preferable to a blind framework downgrade, subject to checking the complete dependency/import graph. No dependency was changed or installed in this investigation.

The existing working-tree edits raise Astro from `^7.0.9` to `^7.4.2` and sitemap from `^3.7.3` to `^3.7.4`. They are held constant here. Sitemap's installed implementation runs build hooks and writes sitemap files; it does not inject a homepage browser runtime. Astro compiler/minifier changes can affect generated output, so the previous cross-build comparison cannot assign causality to them. The new experiment removes that variable.

There are no `client:*` hydration directives or `astro-island` components on this page. Phase 1's URL builder runs in component frontmatter at build time and adds no browser JavaScript. This matches [Astro's documented component model](https://docs.astro.build/en/basics/astro-components/).

Five Splide carousels mount at initial page execution. They register navigation and internal resize/interaction listeners; the hero has its separate five-second timer. Navbar dropdown, passive scroll, mobile controls, booking-date listeners, and Flatpickr also initialize. None of that code changed in Phase 1. Initializing offscreen carousels is a future first-party optimization candidate only if measured worthwhile, with functional regression checks required.

The homepage loads Splide twice: a bundled 4.1.4 module and a 4.1.3 CDN global. The global cannot simply be removed from the shared layout: villa detail gallery code uses global `new Splide(...)`. A future conditional-loading change needs route-specific gallery checks. It is a smaller opportunity than the measured tracking work.

Two direct GA4 loaders, two GTM containers (`GTM-PGV9J9LQ`, `GTM-TNCVRTH5`), Meta Pixel, ContentSquare, and Triptease are configured. Multiple IDs alone do not prove duplicate analytics hits. Ownership, event firing, conversion attribution, and consent behavior need a tracking audit before consolidating or deferring anything. DevTools initiator evidence already confirms that `static.ads.triptease.io/index.js` requests Google Ads tag `AW-789859065`; blocking work attributed to Google can therefore originate through Triptease as well as GTM.

## Controlled results

All 30 planned runs completed successfully; none were discarded. End-of-run hashes confirm that source, dependencies, and compiled assets remained unchanged. MB below means decimal megabytes.

| Median metric | Original, tracking on (10) | Phase 1, tracking on (10) | Original, local tracking block (5) | Phase 1, local tracking block (5) |
| --- | ---: | ---: | ---: | ---: |
| Performance score | 66.5 | 70.5 | 86 | 89 |
| FCP | 2.592 s | 2.554 s | 2.630 s | 2.630 s |
| LCP | 2.705 s | 2.704 s | 3.154 s | 3.155 s |
| TBT | 885.0 ms | 1,003.5 ms | 48.0 ms | 23.0 ms |
| Speed Index | 2.705 s | 2.704 s | 5.040 s | 2.630 s |
| CLS | 0 | 0 | 0 | 0 |
| Main-thread work | 4,127.8 ms | 4,070.7 ms | 1,696.4 ms | 1,473.1 ms |
| Image transfer | 8.224 MB | 5.957 MB | 8.224 MB | 5.957 MB |
| Offer image transfer | 2.648 MB | 0.381 MB | 2.648 MB | 0.381 MB |
| Total page transfer | 9.845 MB | 7.619 MB | 8.512 MB | 6.258 MB |

The earlier six-point score regression did **not** repeat when dependencies and assets were held constant. This does not prove a four-point score improvement: score distributions overlap, remote tags vary, and the paired score interval spans both improvement and regression. The robust finding is **85.6% fewer offer-image bytes**, about 2.267 MB saved.

### Variability

| Metric | Original tracking-on: Q1–Q3; full range | Phase 1 tracking-on: Q1–Q3; full range |
| --- | --- | --- |
| Score | 65.25–71.25; 54–84 | 67.5–73; 65–74 |
| TBT | 576–1,298 ms; 342–2,055 ms | 801–1,306 ms; 408–2,103 ms |
| LCP | 2.7044–2.7048 s; 2.704–5.340 s | 2.7032–2.7042 s; 2.553–2.705 s |
| Speed Index | 2.648–7.188 s; 2.554–8.881 s | 2.592–2.977 s; 2.479–11.079 s |

The median paired TBT difference (Phase 1 minus original) is +94.8ms; its exploratory 95% bootstrap interval is approximately **−362 to +411ms**. It does not establish a TBT regression or improvement. The median paired score difference is +2 points, interval **−2.5 to +7**. Ten measurements per version are more informative than the old five-run batches, but still cannot resolve small effects on this noisy host. No statistical interval should be interpreted as overcoming uncontrolled remote-script behavior.

Host benchmark-index medians were 1,222 for original and 1,402 for Phase 1; ranges were 962–3,329 and 1,266–1,490. Nominal CPU/network settings, hardware, browser, Node, source, and run procedure matched; real execution capacity was not perfectly constant. All outliers were retained.

Four original and two optimized live runs captured visual changes after five seconds. That imbalance reverses the old batches' pattern and reinforces why the autoplay-sensitive Speed Index and the overall score require repeated measurements. The hero timer, transitions, images, and image delivery were identical between variants.

### Tracking-block diagnostics

With Phase 1 retained, blocking tracking domains locally reduced median TBT from **1,003.5 to 23ms (97.7%)**, main-thread work from **4,071 to 1,473ms (63.8%)**, and script evaluation from **2,180 to 208ms (90.5%)**. Original-delivery TBT similarly fell from 885 to 48ms. Network logs confirm no successful tracking-script responses in the ten blocked runs; functional jsDelivr scripts remained available.

This is strong evidence that the tracking stack dominates blocking work. It is an upper-bound diagnostic, not a proposal to remove all tracking or a promise that selective changes will reproduce the entire reduction. The diagnostics also show that lower TBT does not automatically improve this page's simulated LCP: blocked-run LCP remained around 3.15s. Production tracking and booking code were never disabled or edited.

## Current main-thread and script analysis

Phase 1, tracking-on medians:

| Main-thread category | Time |
| --- | ---: |
| Script evaluation | 2,180 ms |
| Script parsing/compilation | 474 ms |
| Other | 953 ms |
| Style/layout | 348 ms |
| Rendering | 117 ms |
| Garbage collection | 58 ms |
| HTML/CSS parsing | 49 ms |

Category medians are calculated separately and do not sum exactly to the median total. Reported long-task count was 17.5 at the median (11–21 across runs); median longest task was 345ms, maximum 542ms. The 542ms task was attributed to Meta's pixel configuration. Other large tasks included GA4 `G-H09V6L9R0B` executions lasting up to 487ms.

| Script / entity in current optimized runs | Median CPU | Median attributed blocking |
| --- | ---: | ---: |
| Google tags / GTM, combined | 1,276 ms | 810 ms |
| Facebook / Meta, combined | 568 ms | 367 ms |
| Triptease, own scripts | 389 ms | 97 ms |
| ContentSquare | 98 ms | 40 ms |
| jsDelivr functional libraries | 41 ms | 0 ms |

Leading individual scripts:

| Script | Median CPU | Median attributed blocking |
| --- | ---: | ---: |
| `gtag/js?id=G-H09V6L9R0B` | 614 ms | 445 ms |
| `gtag/js?id=G-WRT2WJJ3E1` | 471 ms | 322 ms |
| Meta `signals/config/1772152629691333` | 334 ms | 233 ms |
| Triptease `bootstrap.js` | 241 ms | 79 ms |
| Meta `fbevents.js` | 234 ms | 133 ms |
| `gtm.js?id=GTM-PGV9J9LQ` | 133 ms | 54 ms |
| `gtm.js?id=GTM-TNCVRTH5` | 117 ms | 40 ms |

URL variants are grouped by path and tag ID. Some downstream Ads scripts load only in a subset of runs and therefore have zero median across all ten; they still dominate particular old and current long tasks. Median-per-script numbers must not be summed into a synthetic total.

DevTools stacks identify these paths:

- Triptease `static.ads.triptease.io/index.js` → Google Ads `AW-789859065`.
- Triptease `static.meta.triptease.io/index.js` → `AW-17389219279`.
- Triptease `static.paidsearch.triptease.io/index.js` → existing Google tag code → `AW-17391025599` and `AW-400578053`.

Consequently, Google-attributed time understates Triptease's full downstream impact if one counts only scripts hosted on `triptease.io`. The initiator evidence identifies loading responsibility, not whether those advertising destinations are unnecessary.

The local Splide module's total attributed CPU was 182ms, including about 107ms of script evaluation, across all five carousels; it is not an offer-only measurement. Inline/document script evaluation was about 61ms, with 10ms parsing. The much larger 736ms attributed to the document URL includes rendering/layout-related work and must not be mistaken for 736ms of booking JavaScript. There is no evidence of hydration overhead or a Phase-1 listener leak.

All 30 raw traces were also inspected for recorded image decoding. Recorded `Decode Image` events were JPEG/PNG and ran off the main thread; none showed main-thread image decoding. No recorded AVIF decode task explains the old TBT increase. Trace instrumentation is not exhaustive proof that codec work is free, but the image optimization added no browser JS and the controlled blocked tests do not show a corresponding blocking regression.

## LCP verification

**The LCP element is `img#navbar-logo-full` in all 30 controlled runs and all 10 previous reports.** Its local PNG is 17,955 response-body bytes, with eager loading and high fetch priority already set. No offer image was an LCP candidate.

The instrumented mobile browser measured the hero at exactly **412 × 823 CSS pixels**, filling the viewport. Chromium documents full-viewport images as a class it can exclude from LCP; the observed logo selection is consistent with that heuristic. The browser did not provide an explicit exclusion reason, so the explanation for hero exclusion is an inference supported by dimensions, paint events, and [the documented LCP heuristics](https://web.dev/articles/lcp). This logo LCP should not be treated as a complete measure of how quickly the hero looks ready.

In current optimized Lighthouse reports, the median simulated LCP breakdown includes about 451ms TTFB, 145ms load delay, 125ms resource load, and 1,938ms render delay. Separately calculated median phases do not sum exactly to median LCP. The observed, unthrottled trace phases were about 5ms TTFB, 16ms resource delay, 18ms resource load, and 101ms render delay. These are different timing models and must not be mixed.

The old 10.65s outlier had the same logo as LCP, with about **10.20s simulated render delay**, rather than a large logo download. Its source/loading attributes did not change. This points to critical-path/render scheduling, not oversized carousel bytes, as the relevant LCP mechanism.

A supplemental direct `PerformanceObserver` check used actual 4× CPU throttling (not Lighthouse's simulated timing model), unchanged HTML, and one load per condition. With tracking on, the logo response finished at 145.5ms but its LCP render occurred at 7,284ms; with local tracking blocks it finished at 117.5ms and rendered at 252ms. This illustrates that scripts/decoding/render scheduling can delay paint long after a small resource has arrived. It is not a replacement median or a production-speed estimate. The same probe found zero hydrated islands and retained all hero/header URLs and loading attributes.

## Prioritized recommendations — proposals only

| Priority / category | Proposed follow-up | Expected benefit from evidence | Risks / required validation |
| --- | --- | --- | --- |
| 1 — Third-party scripts | Inventory both GTM containers, both GA4 IDs, Meta Pixel, and Triptease's Ads/meta/paid-search destinations with their owners. Check overlap, duplicate events, intended Ads accounts, and trigger timing before consolidation. | Targets the largest identified long tasks. Local all-tracking block is an upper bound: ~981ms less median TBT on the optimized page. | Removing or delaying a legitimate tag can lose attribution, consent state, early-bounce events, or booking conversion linkage. Do not remove tags based only on multiple IDs. |
| 1 — TBT | After that inventory, propose selective deduplication or later execution of approved noncritical marketing work; measure each change separately with tracking/booking QA. | Current Google and Meta workloads dominate; a much larger opportunity than carousel initialization. | Exact savings are unmeasured until a specific proposal is tested. `async` loading alone does not make execution nonblocking. Preserve required attribution and booking handoffs. |
| 2 — Dependencies | Audit and then remove the unused `astro-carousel` dependency in a separate change, or obtain an explicitly compatible supported version if another consumer is found. Keep framework upgrades separate from performance experiments. | Eliminates a real Astro 5 versus Astro 7 peer mismatch and avoids forced resolution during future installs. No demonstrated homepage TBT benefit. | Full import/build/route checks are required. Do not blind-upgrade, downgrade, or force-install. No package change is needed to retain Phase 1. |
| 2 — LCP | Profile logo paint/critical CSS and module scheduling under repeatable conditions; monitor visible hero progress as well as logo LCP. Reduce proven render-path contention without changing image delivery. | The logo is already eager/high-priority; long render delay is more relevant than shrinking its 18KB resource. | Tracking-block diagnostics did not improve simulated LCP, so do not promise that TBT work alone will fix it. Avoid optimizing the metric by changing design or hero behavior. |
| 3 — TBT / first-party JS | Consider mounting offscreen Splide carousels when near the viewport, and avoiding the unused global Splide copy on the homepage only. Keep Flatpickr and booking controls ready when needed. | Smaller potential savings: bundled Splide currently ~107ms script evaluation across five carousels; external functional libraries ~41ms CPU. | Deferred mounting can break navigation, responsive sizing, keyboard access, or stable card layout. Shared global Splide is used by villa gallery modals; do not remove it globally. |
| 3 — Image transfer | Retain Phase 1. Evaluate the next explicitly scoped supporting-image component with the same role protection and build-frozen AB/BA benchmark. | Phase 1 consistently saves ~2.267MB / 85.6% of offer bytes. Other transfer savings require component-specific measurements. | Image changes should not be sold as a solution to Google/Meta blocking time. Preserve crop, hotspots, aspect ratio, density, and header/hero isolation. No Phase 2 work was done. |

Before any follow-up implementation, keep this frozen-build benchmark method, report host variability and individual runs, and avoid comparing image work across unrelated framework changes. The autoplay-sensitive Speed Index should remain reported, with its filmstrip context; the investigation did not freeze or change the hero to improve the score.

## Decision and delivered artifacts

**Phase 1 is safe to retain based on this investigation.** It preserves all non-offer markup and JS/CSS, retains the measured transfer reduction, and does not reproduce the earlier large TBT regression. Small timing effects remain below what these variable measurements can resolve; no claim of guaranteed score improvement is made.

**Phase 2 is technically reasonable as a separate bandwidth-reduction project, but it is not the next priority if the goal is a materially higher Lighthouse score or lower TBT.** Prioritize the tracking/third-party audit and dependency maintenance separately. Any next image phase needs its own explicit component scope and the same header/hero protection. Stop after this investigation; no Phase 2 implementation or deployment has occurred.

Added investigation-only files:

- `scripts/investigate-offer-performance.mjs` — frozen-build local AB/BA Lighthouse runner and source/asset invariants.
- `scripts/analyze-offer-performance.mjs` — distribution, main-thread, script, and per-run LCP analysis.
- `scripts/inspect-offer-traces.mjs` — recorded image decode checks and Google Ads initiator evidence.
- `docs/offer-carousel-performance-investigation.md` — this report.
- `docs/offer-carousel-performance-investigation.json` — compact results, all 30 per-run LCP identities, variability, and supporting evidence.

Raw artifacts and the supplemental local observer script/results are under `.cache/offer-investigation/`. Reproduction requires the existing Phase-1 original-tag snapshot and isolated tools described in the runner; no packages were installed, upgraded, downgraded, or force-resolved here. The previous Phase 1 source, component, helper, tests, dependency files, and report were left unchanged. Final verification rechecked 47 source/configuration/dependency-manifest hashes and 11 compiled JS/CSS asset hashes. All three investigation scripts passed `node --check`; `git diff --check` passed. No application rebuild was necessary because application source and build assets were unchanged.
