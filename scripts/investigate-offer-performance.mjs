// Local investigation only. Does not edit the website, dependencies, or CMS.
// Uses the isolated Lighthouse tools installed during Phase 1.
import http from 'node:http';
import path from 'node:path';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import lighthouse from '../.cache/offer-carousel-tools/node_modules/lighthouse/core/index.js';
import { launch } from '../.cache/offer-carousel-tools/node_modules/chrome-launcher/dist/index.js';

const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
const output = path.resolve(options.output ?? '.cache/offer-investigation');
const liveRuns = Number(options['live-runs'] ?? 10);
const blockedRuns = Number(options['blocked-runs'] ?? 5);
const port = Number(options.port ?? 4323);
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = path.resolve('public_html');
const sha = value => createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
mkdirSync(path.join(output, 'raw'), { recursive: true });

function hashes(directory) {
  const result = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(result, hashes(file));
    else result[file.replaceAll('\\', '/')] = sha(readFileSync(file));
  }
  return result;
}

const sourceHashes = {
  ...hashes('src'),
  ...Object.fromEntries(['package.json', 'package-lock.json', 'astro.config.mjs'].map(file => [file, sha(readFileSync(file))])),
};
const optimized = readFileSync(path.join(root, 'en/index.html'), 'utf8');
const old = readJson('.cache/offer-carousel/before/html.json')['en/index.html'].html;
function offerTags(html) {
  const start = html.indexOf('id="offer-carousel"');
  const end = html.indexOf('id="offer-prev"', start);
  assert.ok(start > 0 && end > start);
  return [...html.slice(start, end).matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
}
const originalTags = offerTags(old);
const optimizedTags = offerTags(optimized);
assert.equal(originalTags.length, 7);
assert.equal(optimizedTags.length, 7);
let original = optimized;
optimizedTags.forEach((tag, index) => { original = original.replace(tag, originalTags[index]); });
const neutral = (html, tags) => tags.reduce((text, tag, index) => text.replace(tag, `OFFER_IMAGE_${index}`), html);
assert.equal(neutral(original, originalTags), neutral(optimized, optimizedTags));
const scriptAndStyle = html => [...html.matchAll(/<script\b[\s\S]*?<\/script>|<link\b[^>]*>/g)].map(match => match[0]);
assert.deepEqual(scriptAndStyle(original), scriptAndStyle(optimized));
const otherImages = (html, offers) => [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]).filter(tag => !offers.includes(tag));
assert.deepEqual(otherImages(original, originalTags), otherImages(optimized, optimizedTags));
const originalPaths = originalTags.map(tag => new URL(tag.match(/src="([^"]+)"/)[1]).pathname);

// These are measurement-only request blocks. Functional jsDelivr libraries,
// Sanity images, local assets, and all website source files remain untouched.
const blockedDomains = [
  'googletagmanager.com', 'google-analytics.com', 'analytics.google.com',
  'googleadservices.com', 'googlesyndication.com', 'doubleclick.net',
  'google.com/ccm', 'google.com/pagead', 'facebook.net', 'facebook.com/tr',
  'contentsquare.net', 'contentsquare.com', 'triptease.io',
  'hotjar.com', 'hotjar.io', 'clarity.ms', 'tiktok.com',
];
const previous = readJson('.cache/offer-carousel/before/lighthouse-1.json').configSettings;
const settings = Object.fromEntries([
  'formFactor', 'screenEmulation', 'emulatedUserAgent', 'throttling',
  'throttlingMethod', 'maxWaitForFcp', 'maxWaitForLoad', 'pauseAfterFcpMs',
  'pauseAfterLoadMs', 'networkQuietThresholdMs', 'cpuQuietThresholdMs',
].filter(key => previous[key] !== undefined).map(key => [key, previous[key]]));
const manifest = {
  createdAt: new Date().toISOString(), node: process.version,
  versions: Object.fromEntries(['astro', '@astrojs/sitemap', 'astro-carousel', '@splidejs/splide', '@sanity/image-url'].map(name => [name, readJson(`node_modules/${name}/package.json`).version])),
  lighthouse: readJson('.cache/offer-carousel-tools/node_modules/lighthouse/package.json').version,
  url: `http://127.0.0.1:${port}/en/`, settings, blockedDomains,
  runs: { live: liveRuns, blocked: blockedRuns },
  construction: 'Both variants use one existing Astro production build. Only the seven offer img tags are substituted with their recorded pre-Phase-1 tags in the original variant.',
  invariantHash: sha(neutral(optimized, optimizedTags)),
  htmlHashes: { original: sha(original), optimized: sha(optimized) },
  identicalScriptsAndLinks: true, identicalNonOfferImageTags: true,
  assets: hashes(path.join(root, '_astro')), sourceHashes,
};
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(path.join(output, 'original.html'), original);
writeFileSync(path.join(output, 'optimized.html'), optimized);

let activeVersion = 'optimized';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, manifest.url);
    let body;
    let file;
    if (url.pathname === '/en/' || url.pathname === '/en/index.html') {
      file = 'index.html'; body = activeVersion === 'original' ? original : optimized;
    } else {
      file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
      body = readFileSync(file);
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

const rows = [];
try {
  for (const mode of ['live', 'blocked']) {
    const count = mode === 'live' ? liveRuns : blockedRuns;
    for (let pair = 1; pair <= count; pair++) {
      // Alternate AB / BA to reduce systematic time/order bias.
      const order = pair % 2 ? ['original', 'optimized'] : ['optimized', 'original'];
      for (const version of order) {
        activeVersion = version;
        const name = `${mode}-${String(pair).padStart(2, '0')}-${version}`;
        const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
        try {
          const result = await lighthouse(manifest.url, {
            ...settings, port: chrome.port, onlyCategories: ['performance'],
            logLevel: 'error', output: 'json', locale: 'en-US',
            blockedUrlPatterns: mode === 'blocked' ? blockedDomains.map(domain => `*${domain}*`) : [],
          });
          const { lhr, artifacts } = result;
          writeFileSync(path.join(output, 'raw', `${name}.lhr.json`), JSON.stringify(lhr));
          writeFileSync(path.join(output, 'raw', `${name}.trace.json.gz`), gzipSync(JSON.stringify(artifacts.Trace ?? artifacts.traces?.defaultPass)));
          writeFileSync(path.join(output, 'raw', `${name}.devtools.json.gz`), gzipSync(JSON.stringify(artifacts.DevtoolsLog ?? artifacts.devtoolsLogs?.defaultPass)));
          const audits = lhr.audits;
          const requests = audits['network-requests'].details.items;
          const node = audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node;
          const row = {
            name, mode, pair, version, score: Math.round(lhr.categories.performance.score * 100),
            fcp: audits['first-contentful-paint'].numericValue,
            lcp: audits['largest-contentful-paint'].numericValue,
            tbt: audits['total-blocking-time'].numericValue,
            cls: audits['cumulative-layout-shift'].numericValue,
            speedIndex: audits['speed-index'].numericValue,
            pageBytes: audits['total-byte-weight'].numericValue,
            imageBytes: requests.filter(item => item.resourceType === 'Image').reduce((sum, item) => sum + (item.transferSize ?? 0), 0),
            offerBytes: requests.filter(item => originalPaths.some(p => item.url.includes(p))).reduce((sum, item) => sum + (item.transferSize ?? 0), 0),
            mainThread: audits['mainthread-work-breakdown'].numericValue,
            lcpSelector: node?.selector, lcpSnippet: node?.snippet,
            benchmarkIndex: lhr.environment.benchmarkIndex,
            hostUserAgent: lhr.environment.hostUserAgent,
            warnings: lhr.runWarnings, runtimeError: lhr.runtimeError,
          };
          assert.ok(!row.runtimeError, JSON.stringify(row.runtimeError));
          rows.push(row);
          writeFileSync(path.join(output, 'runs.json'), JSON.stringify(rows, null, 2));
          console.log(JSON.stringify(row));
        } finally { await chrome.kill(); }
      }
    }
  }
} finally {
  server.close();
  const endHashes = { ...hashes('src'), ...Object.fromEntries(['package.json', 'package-lock.json', 'astro.config.mjs'].map(file => [file, sha(readFileSync(file))])) };
  assert.deepEqual(endHashes, sourceHashes, 'Website source/dependencies changed during benchmark');
  assert.deepEqual(hashes(path.join(root, '_astro')), manifest.assets, 'Build JS/CSS changed during benchmark');
  writeFileSync(path.join(output, 'invariants-verified.json'), JSON.stringify({ sourceUnchanged: true, dependenciesUnchanged: true, buildAssetsUnchanged: true, completedRuns: rows.length }, null, 2));
}
