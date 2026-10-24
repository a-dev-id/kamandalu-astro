// Read-only Sanity audit and baseline snapshot for the homepage-only Q95 test.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import client from '../src/lib/sanityClient.js';

const output = '.cache/homepage-hero-webp-q95';
if (existsSync(`${output}/baseline.json`)) throw Error('Baseline already exists; preserve the evidence before taking another snapshot.');
mkdirSync(`${output}/assets`, { recursive: true });
cpSync('public_html', `${output}/before/site`, { recursive: true });
cpSync('src', `${output}/before/source`, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const hashes = {};
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else hashes[file.replaceAll('\\', '/')] = hash(readFileSync(file));
  }
}
walk('src');
for (const file of ['package.json', 'package-lock.json', 'astro.config.mjs']) hashes[file] = hash(readFileSync(file));
const slides = await client.fetch(`*[_type == "homeSlider"] | order(order asc){
  _id, order, title,
  image { ..., asset->{ _id, url, mimeType, size, metadata { dimensions } } }
}`);
const originalHtml = readFileSync(`${output}/before/site/en/index.html`, 'utf8');
const heroSection = originalHtml.slice(originalHtml.indexOf('id="carousel"'), originalHtml.indexOf('<!-- Overlay for darkening'));
const tags = [...heroSection.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
if (tags.length !== slides.length) throw Error(`Published slides ${slides.length} differ from current build ${tags.length}`);
const images = [];
for (let index = 0; index < slides.length; index++) {
  const slide = slides[index];
  const originalUrl = slide.image.asset.url;
  if (!tags[index].includes(originalUrl)) throw Error('Published slider order differs from the frozen build');
  const webpUrl = new URL(originalUrl);
  webpUrl.searchParams.set('fm', 'webp');
  webpUrl.searchParams.set('q', '95');
  const name = `hero-${String(index + 1).padStart(2, '0')}`;
  const variants = {};
  for (const [variant, url, extension] of [['original', originalUrl, 'jpg'], ['webp-q95', webpUrl.href, 'webp']]) {
    const response = await fetch(url, { headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } });
    if (!response.ok) throw Error(`${response.status} for ${url}`);
    const body = Buffer.from(await response.arrayBuffer());
    const file = `${output}/assets/${name}-${variant}.${extension}`;
    writeFileSync(file, body);
    variants[variant] = { url, file, bytes: body.length, contentType: response.headers.get('content-type'), contentLength: response.headers.get('content-length'), contentEncoding: response.headers.get('content-encoding'), sha256: hash(body) };
  }
  const record = { index, name, title: slide.title, documentId: slide._id, order: slide.order, originalResolution: slide.image.asset.metadata.dimensions, originalMime: slide.image.asset.mimeType, authoredCrop: slide.image.crop ?? null, authoredHotspot: slide.image.hotspot ?? null, originalTag: tags[index], loading: tags[index].match(/loading="([^"]+)"/)?.[1], fetchpriority: tags[index].match(/fetchpriority="([^"]+)"/)?.[1], cropBehavior: 'Asset URL only; authored crop/hotspot are not applied by the existing renderer. CSS object-fit: cover; centered object-position.', variants };
  images.push(record);
  console.log(JSON.stringify({ image: index + 1, title: slide.title?.en, original: variants.original.bytes, webp: variants['webp-q95'].bytes, saving: variants.original.bytes - variants['webp-q95'].bytes, crop: record.authoredCrop, hotspot: record.authoredHotspot }));
}
writeFileSync(`${output}/baseline.json`, JSON.stringify({ date: new Date().toISOString(), node: process.version, hashes, images }, null, 2));
