// Lossless browser screenshots and decoded-pixel comparisons. Downloaded CDN
// assets are not re-encoded or resized by this script.
import http from 'node:http';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';

const root = path.resolve(process.env.HERO_WEBP_EVIDENCE ?? '.cache/homepage-hero-webp');
const baseline = JSON.parse(readFileSync(`${root}/baseline.json`));
const candidateKey = baseline.candidateKey ?? 'webp-q95';
const candidateFile = image => path.basename(image.variants[candidateKey].file);
const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['native','detail','desktop','mobile'];
assert.ok(modes.every(mode=>['native','detail','desktop','mobile'].includes(mode)));
const previous = existsSync(`${root}/comparison.json`) ? JSON.parse(readFileSync(`${root}/comparison.json`)) : [];
mkdirSync(`${root}/comparison`,{recursive:true});
mkdirSync(`${root}/review`,{recursive:true});
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number = n => n.toLocaleString('en-US');
const styles = `*{box-sizing:border-box}body{margin:0;padding:16px;background:#fff;color:#20272b;font:16px/1.5 "Segoe UI",Arial,sans-serif}h1{font-size:24px;line-height:1.25;margin:0 0 8px}h2{font-size:18px;margin:0 0 8px}p{margin:0 0 12px}.pair{display:grid;gap:16px;grid-template-columns:repeat(2,var(--width))}.pair img{display:block;max-width:none}.crop{width:640px;height:360px;overflow:hidden;margin-bottom:12px}.crop img{width:1920px;height:1080px}.label{font-weight:600;margin-bottom:8px}`;
function pairPage(image, mode) {
  const size = {native:[1920,1080],desktop:[1440,900],mobile:[780,1688],detail:[640,360]}[mode];
  const {name} = image;
  const sources = mode==='native'||mode==='detail' ? [`/assets/${name}-original.jpg`,`/assets/${candidateFile(image)}`] : [`/before/screenshots/${name}-${mode}.png`,`/after/screenshots/${name}-${mode}.png`];
  const panes = sources.map((source,index)=>{
    const retained=image.keepOriginal&&['desktop','mobile'].includes(mode);
    const label=index?(retained?'B — Original JPG retained (shared source)':`B — WebP Q${image.quality??95}`):'A — Original JPG';
    const bytes=image.variants[index&&!retained?candidateKey:'original'].bytes;
    const content=mode==='detail'?`<p>Center crop: x640, y360, 640×360; 1:1 pixels</p><div class="crop"><img src="${source}" style="transform:translate(-640px,-360px)"></div><p>Bottom-left crop: x0, y720, 640×360; 1:1 pixels</p><div class="crop"><img src="${source}" style="transform:translate(0,-720px)"></div>`:`<img src="${source}" width="${size[0]}" height="${size[1]}">`;
    return `<section><div class="label">${label} · ${number(bytes)} bytes</div>${content}</section>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body style="width:${size[0]*2+48}px"><h1>${image.index+1}. ${escape(image.title.en)} — ${mode} comparison</h1><p>${mode==='native'?'1920×1080 originals displayed at 1:1 pixels':mode==='mobile'?'390×844 CSS viewport, DPR2; screenshot pixels shown at native size':mode==='desktop'?'1440×900 viewport, DPR1; same slider position':'Unscaled detail crops; no sharpening or difference amplification'}</p><div class="pair" style="--width:${size[0]}px">${panes}</div></body></html>`;
}
const review = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kamandalu homepage JPG / size-capped WebP comparison</title><style>${styles}body{background:#f4f4f1;max-width:1200px;margin:auto;padding:24px}article{padding:24px;margin:24px 0;background:white;border:1px solid #ddd}figure{position:relative;margin:16px 0;aspect-ratio:16/9;background:#222}figure img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.overlay{clip-path:inset(0 50% 0 0)}input[type=range]{width:100%}.links{display:flex;gap:16px;flex-wrap:wrap}a{color:#31536d}.note{color:#754020}label{display:block;font-weight:600}small{font-size:14px}</style></head><body><h1>Homepage hero: JPG vs size-capped WebP</h1><p>Local comparison only. Each candidate uses the same 1920×1080 asset with only fm=webp and the recorded quality added. Move each slider to reveal WebP on the left and original JPG on the right. Open native-size PNGs for 1:1 detail inspection.</p><p class="note">Every selected candidate is smaller than its JPG. The shared aerial image remains JPG in the local homepage to avoid duplicate downloads; its native/detail comparison still shows the tested WebP. WebP is lossy and cannot recover detail already lost in the original JPEG.</p>${baseline.images.map(image=>`<article><h2>${image.index+1}. ${escape(image.title.en)}</h2><p>Original: ${number(image.variants.original.bytes)} bytes · WebP Q${image.quality??95}: ${number(image.variants[candidateKey].bytes)} bytes · Saving: ${((1-image.variants[candidateKey].bytes/image.variants.original.bytes)*100).toFixed(2)}%${image.keepOriginal?' · JPG retained in actual homepage':''}</p><figure><img src="../assets/${image.name}-original.jpg" alt="Original ${escape(image.title.en)}"><img class="overlay" id="${image.name}-overlay" src="../assets/${candidateFile(image)}" alt="WebP Q${image.quality??95} ${escape(image.title.en)}"></figure><label for="${image.name}-range">WebP reveal <input id="${image.name}-range" type="range" min="0" max="100" value="50" oninput="document.getElementById('${image.name}-overlay').style.clipPath='inset(0 '+(100-this.value)+'% 0 0)'"></label><div class="links">${['native','detail','desktop','mobile'].map(mode=>`<a href="../comparison/${image.name}-${mode}-side-by-side.png">${mode} side by side</a>`).join('')}<a href="../assets/${image.name}-original.jpg">Original file</a><a href="../assets/${candidateFile(image)}">WebP file</a></div></article>`).join('')}<small>Autoplay was held only in the local screenshot response for both versions. Application autoplay/transitions and all third-party scripts are unchanged. Screenshots are PNG; source files are saved byte-for-byte.</small></body></html>`;
writeFileSync(`${root}/review/index.html`,review);
const server=http.createServer((req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1:4328');
    if(url.pathname==='/pair') {res.setHeader('Content-Type','text/html');res.end(pairPage(baseline.images[Number(url.searchParams.get('image'))],url.searchParams.get('mode')));return;}
    const file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep))throw Error('Outside evidence root');
    const body=readFileSync(file);
    res.setHeader('Content-Type',({'.html':'text/html','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png'})[path.extname(file)]??'application/octet-stream');res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4328,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try {
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const image of baseline.images){
    await page.goto(`http://127.0.0.1:4328/pair?image=${image.index}&mode=native`,{waitUntil:'load'});
    const metrics=await page.evaluate(async()=>{
      const images=[...document.images];await Promise.all(images.map(image=>image.decode()));
      const buffers=images.map(image=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};});
      const [a,b]=buffers;let square=0,absolute=0,max=0;const histogram=Array(256).fill(0);const mean=[0,0,0];
      for(let i=0;i<a.data.length;i+=4)for(let c=0;c<3;c++){const delta=b.data[i+c]-a.data[i+c];const d=Math.abs(delta);square+=d*d;absolute+=d;max=Math.max(max,d);histogram[d]++;mean[c]+=delta;}
      const count=a.width*a.height*3;let total=0,p95=0;for(let n=0;n<256;n++){total+=histogram[n];if(total>=count*.95){p95=n;break;}}
      return {originalDimensions:[a.width,a.height],webpDimensions:[b.width,b.height],rgbMeanAbsoluteDifference:absolute/count,rgbRootMeanSquareDifference:Math.sqrt(square/count),rgb95PercentileAbsoluteDifference:p95,maximumChannelDifference:max,meanSignedRgbShift:mean.map(value=>value/(a.width*a.height))};
    });
    assert.deepEqual(metrics.originalDimensions,[1920,1080]);assert.deepEqual(metrics.webpDimensions,[1920,1080]);
    const comparisons={...previous.find(record=>record.index===image.index)?.comparisons};
    for(const mode of modes){
      const width=({native:3888,detail:1328,desktop:2928,mobile:1608})[mode];
      await page.setViewportSize({width,height:mode==='mobile'?1850:1250});
      await page.goto(`http://127.0.0.1:4328/pair?image=${image.index}&mode=${mode}`,{waitUntil:'load'});
      await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
      const file=`${root}/comparison/${image.name}-${mode}-side-by-side.png`;
      await page.screenshot({path:file,fullPage:true});comparisons[mode]=file;
    }
    results.push({index:image.index,name:image.name,...metrics,comparisons});
    writeFileSync(`${root}/comparison.json`,JSON.stringify(results,null,2));
    console.log(JSON.stringify({image:image.index+1,meanAbsoluteDifference:metrics.rgbMeanAbsoluteDifference,rmse:metrics.rgbRootMeanSquareDifference,p95:metrics.rgb95PercentileAbsoluteDifference}));
  }
} finally {await browser.close();server.close();}
