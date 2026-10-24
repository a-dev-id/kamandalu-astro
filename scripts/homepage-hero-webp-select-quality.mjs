// Find the highest tested integer WebP quality below the original JPG payload.
// Candidates are checked in descending order; no resizing or crop parameters.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';

const previous = '.cache/homepage-hero-webp-q95';
const output = '.cache/homepage-hero-webp';
const baseline = JSON.parse(readFileSync(`${previous}/baseline.json`));
const originalHtml = readFileSync(`${previous}/before/site/en/index.html`,'utf8');
const imageSources = [...originalHtml.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
mkdirSync(`${output}/assets`, { recursive:true });
cpSync(`${previous}/before`, `${output}/before`, { recursive:true });
const images = [];
let cursor = 0;
async function worker() {
  while (cursor < baseline.images.length) {
    const image = baseline.images[cursor++];
    const tested = [{ quality:95, bytes:image.variants['webp-q95'].bytes }];
    let selected;
    for (let quality=94;quality>=1;quality--) {
      const url = new URL(image.variants.original.url);
      url.searchParams.set('fm','webp');
      url.searchParams.set('q',String(quality));
      const response = await fetch(url, { headers:{Accept:'image/webp,image/*,*/*;q=0.8'} });
      if (!response.ok) throw Error(`${response.status}: ${url}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.headers.get('content-type')?.startsWith('image/webp')) throw Error('Expected WebP');
      tested.push({ quality, bytes:body.length });
      if (body.length <= image.variants.original.bytes) {
        const file = `${output}/assets/${image.name}-webp.webp`;
        writeFileSync(file,body);
        selected = { url:url.href, file, bytes:body.length, contentType:response.headers.get('content-type'), quality, sha256:createHash('sha256').update(body).digest('hex') };
        break;
      }
    }
    if (!selected) throw Error(`No smaller full-resolution WebP found: ${image.name}`);
    const originalFile = `${output}/assets/${image.name}-original.jpg`;
    copyFileSync(image.variants.original.file,originalFile);
    const keepOriginal=imageSources.filter(src=>src===image.variants.original.url).length>1;
    images.push({...image,quality:selected.quality,keepOriginal,retentionReason:keepOriginal?'Reuse the JPG already needed by an unchanged supporting card; avoid downloading both formats.':null,tested,variants:{original:{...image.variants.original,file:originalFile},webp:selected}});
    images.sort((a,b)=>a.index-b.index);
    writeFileSync(`${output}/selection.json`,JSON.stringify({images},null,2));
    console.log(JSON.stringify({image:image.index+1,title:image.title.en,quality:selected.quality,original:image.variants.original.bytes,webp:selected.bytes,saved:image.variants.original.bytes-selected.bytes}));
  }
}
await Promise.all(Array.from({length:3},()=>worker()));
writeFileSync(`${output}/baseline.json`,JSON.stringify({...baseline,date:new Date().toISOString(),candidateKey:'webp',images},null,2));
