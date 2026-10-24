// Local comparison harness. Only the first-party hero autoplay is held in the
// served comparison response; app files and every external script stay intact.
import http from 'node:http';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';

const version = process.argv[2];
assert.ok(['before', 'after'].includes(version), 'Specify before or after');
const output = path.resolve(process.env.HERO_WEBP_EVIDENCE ?? '.cache/homepage-hero-webp');
const site = path.resolve(version === 'before' ? `${output}/before/site` : 'public_html');
const baseline = JSON.parse(readFileSync(`${output}/baseline.json`));
const candidateKey = baseline.candidateKey ?? 'webp-q95';
mkdirSync(`${output}/${version}/screenshots`, { recursive: true });
const autoplay = /setInterval\(\(\)\s*=>\s*\{\s*currentSlide\s*=\s*\(currentSlide\s*\+\s*1\)\s*%\s*slides\.length;\s*showSlide\(currentSlide\);\s*\},\s*5000\);/g;
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.ttf':'font/ttf', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4327');
    const isEvidence = url.pathname.startsWith('/evidence/');
    const root = isEvidence ? output : site;
    const pathname = isEvidence ? url.pathname.slice('/evidence'.length) : url.pathname;
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) throw Error('Path outside root');
    let body = readFileSync(file);
    if (url.searchParams.has('hero-comparison')) {
      const html = body.toString();
      assert.equal([...html.matchAll(autoplay)].length, 1, 'Expected only the homepage hero timer');
      body = Buffer.from(html.replace(autoplay, 'window.__heroComparisonPaused = true;'));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(body);
  } catch (error) { res.writeHead(404); res.end(String(error)); }
});
await new Promise(resolve => server.listen(4327, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
const captures = [], errors = [];
try {
  for (const device of [{name:'desktop',width:1440,height:900,dpr:1},{name:'mobile',width:390,height:844,dpr:2}]) {
    const context = await browser.newContext({ viewport:{width:device.width,height:device.height}, deviceScaleFactor:device.dpr });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({device:device.name,message:error.message}));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled:true });
    const network = new Map();
    cdp.on('Network.responseReceived', event => network.set(event.requestId, { url:event.response.url, mime:event.response.mimeType, status:event.response.status, headers:event.response.headers, type:event.type }));
    cdp.on('Network.loadingFinished', event => { const record = network.get(event.requestId); if (record) record.encodedTransferBytes = event.encodedDataLength; });
    await page.goto('http://127.0.0.1:4327/en/?hero-comparison=1', { waitUntil:'load',timeout:90000 });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => window.__heroComparisonPaused), true);
    const count = await page.locator('#carousel .carousel-slide').count();
    assert.equal(count, baseline.images.length);
    for (let index = 0; index < count; index++) {
      if (index) { await page.locator('#nextSlide').click(); await page.waitForTimeout(1150); }
      const image = page.locator('#carousel .carousel-slide').nth(index).locator('img');
      await image.evaluate(image => image.decode());
      assert.equal(await page.locator('#carousel .carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('opacity-100'))), index);
      const info = await image.evaluate(image => ({ src:image.currentSrc, naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight, loading:image.loading, fetchpriority:image.fetchPriority, fit:getComputedStyle(image).objectFit, position:getComputedStyle(image).objectPosition, box:{width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height}, opacity:getComputedStyle(image.parentElement).opacity }));
      assert.equal(info.opacity, '1');
      const expected = baseline.images[index];
      assert.equal(info.src, expected.variants[version === 'before'||expected.keepOriginal ? 'original' : candidateKey].url);
      assert.equal(info.naturalWidth, expected.originalResolution.width);
      assert.equal(info.naturalHeight, expected.originalResolution.height);
      assert.equal(info.loading, expected.loading);
      assert.equal(info.fetchpriority, expected.fetchpriority);
      const screenshot = `${output}/${version}/screenshots/${expected.name}-${device.name}.png`;
      await page.screenshot({path:screenshot});
      captures.push({device:device.name,index,...info,screenshot,network:[...network.values()].find(record => record.url === info.src)});
      console.log(JSON.stringify({version,device:device.name,image:index+1,mime:captures.at(-1).network?.mime,resolution:[info.naturalWidth,info.naturalHeight]}));
    }
    // Actual previous/next controls, including wraparound, remain active.
    await page.locator('#nextSlide').click(); await page.waitForTimeout(1150);
    assert.equal(await page.locator('#carousel .carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('opacity-100'))), 0);
    await page.locator('#prevSlide').click(); await page.waitForTimeout(1150);
    assert.equal(await page.locator('#carousel .carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('opacity-100'))), count - 1);
    await context.close();
  }
  if (version === 'after') {
    // No timer substitution in this context: check the real five-second autoplay.
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto('http://127.0.0.1:4327/en/', {waitUntil:'load',timeout:90000});
    const first = await page.locator('#carousel .carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('opacity-100')));
    await page.waitForTimeout(6200);
    const next = await page.locator('#carousel .carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('opacity-100')));
    assert.notEqual(first,next,'Real autoplay should advance');
    writeFileSync(`${output}/after/autoplay.json`,JSON.stringify({first,next,modifiedTimer:false},null,2));
    await page.close();
    for(const lang of ['ko','zh']) {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:4327/${lang}/`,{waitUntil:'load',timeout:90000});
      const images = await page.locator('#carousel img').evaluateAll(images=>images.map(image=>({src:image.currentSrc,complete:image.complete,naturalWidth:image.naturalWidth})));
      assert.equal(images.length,baseline.images.length);
      assert.ok(images.every((image,index)=>baseline.images[index].keepOriginal?image.src===baseline.images[index].variants.original.url:new URL(image.src).searchParams.get('fm')==='webp'&&new URL(image.src).searchParams.get('q')===String(baseline.images[index].quality??95)));
      writeFileSync(`${output}/after/${lang}-smoke.json`,JSON.stringify(images,null,2));
      await page.close();
    }
  }
} finally { await browser.close(); server.close(); }
writeFileSync(`${output}/${version}/browser.json`,JSON.stringify({captures,errors},null,2));
assert.deepEqual(errors,[]);
