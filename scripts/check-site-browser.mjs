// Local validation only. Uses isolated tools; never blocks or changes integrations.
import http from 'node:http';
import path from 'node:path';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';
const version=process.argv[2];
if(!['before','after'].includes(version))throw Error('Specify before or after');
const root=path.resolve(version==='before'?'.cache/site-performance/before/site':'public_html');
const out=`.cache/site-performance/${version}/browser`;mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const pathname=new URL(req.url,'http://127.0.0.1:4326').pathname;const f=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!f.startsWith(root+path.sep))throw Error();const body=readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4326,'127.0.0.1',resolve));
const routes=['/en/','/en/villas/','/en/villa/garden-villa/','/en/offers/','/en/dining/','/en/dining/petulu-restaurant/','/en/spa-wellness/','/en/unique-experiences/','/en/ubud-experiences-and-activities/','/en/ubud-experiences-and-activities/signature-experiences/','/en/wedding-events/','/en/wedding-event/ubud-wedding-venue-and-package/','/en/blog/','/en/blog/2/','/en/gallery/'];
const tasks=routes.flatMap(route=>[{route,width:390,height:844,dpr:2},{route,width:1440,height:900,dpr:1}]);
for(const route of ['/en/','/en/villa/garden-villa/','/en/ubud-experiences-and-activities/signature-experiences/','/en/gallery/'])tasks.push({route,width:820,height:1180,dpr:2});
if(version==='after')for(const lang of ['ko','zh'])for(const part of ['','villas/','gallery/'])tasks.push({route:`/${lang}/${part}`,width:390,height:844,dpr:2});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const onlyRoutes=process.argv.slice(3);
const rows=onlyRoutes.length&&existsSync(`${out}/results.json`)?JSON.parse(readFileSync(`${out}/results.json`,'utf8')).filter(r=>!onlyRoutes.includes(r.route)):[];
try{
 for(const task of tasks.filter(t=>!onlyRoutes.length||onlyRoutes.includes(t.route))){
  if(!existsSync(path.join(root,task.route,'index.html')))continue;
  const context=await browser.newContext({viewport:{width:task.width,height:task.height},deviceScaleFactor:task.dpr});
  const page=await context.newPage();const session=await context.newCDPSession(page);await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
  const requests=new Map(),responses=[],errors=[];
  session.on('Network.responseReceived',e=>requests.set(e.requestId,{url:e.response.url,type:e.type,mime:e.response.mimeType,status:e.response.status}));session.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)responses.push({...r,bytes:e.encodedDataLength});});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4326'+task.route,{waitUntil:'load',timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
  const initial=await page.evaluate(()=>({images:Array.from(document.images).map((i,index)=>({index,src:i.getAttribute('src'),alt:i.alt,top:i.getBoundingClientRect().top,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})),height:document.documentElement.scrollHeight}));
  const screenshotBase=task.route.replaceAll('/','_')+task.width;
  await page.screenshot({path:`${out}/${screenshotBase}-initial.png`});
  const targetSelector='main img:not([width="1600"])';
  const count=await page.locator(targetSelector).count();
  for(let i=0;i<count;i++){
   const img=page.locator(targetSelector).nth(i);
   if(!await img.isVisible())continue;
   await img.scrollIntoViewIfNeeded().catch(()=>{});
   await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1600);
  const images=await page.locator('img').evaluateAll(imgs=>imgs.map((i,index)=>({index,src:i.getAttribute('src'),currentSrc:i.currentSrc,srcset:i.srcset,sizes:i.sizes,alt:i.alt,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,complete:i.complete,loading:i.loading,decoding:i.decoding,visible:!!i.getClientRects().length,classes:i.className,fit:getComputedStyle(i).objectFit,position:getComputedStyle(i).objectPosition,aspect:getComputedStyle(i).aspectRatio,profile:i.dataset.imageLayout,section:i.closest('section')?.className})));
  const typography=await page.locator('h1,h2,h3,p').evaluateAll(els=>els.slice(0,25).map(e=>({tag:e.tagName,text:e.textContent.trim(),font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,color:getComputedStyle(e).color,lineHeight:getComputedStyle(e).lineHeight})));
  const links=await page.locator('a[href]').evaluateAll(els=>els.map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})));
  const gallery=page.locator('#gallery-grid, section:has(#openGallery)');if(await gallery.count())await gallery.first().screenshot({path:`${out}/${screenshotBase}-supporting.png`}).catch(()=>{});
  const carousel=page.locator('#villa-carousel, #offer-carousel, #experience-category-carousel');if(await carousel.count())await carousel.first().screenshot({path:`${out}/${screenshotBase}-supporting.png`}).catch(()=>{});
  const broken=images.filter(i=>i.visible&&i.currentSrc&&i.complete&&i.naturalWidth===0&&!i.currentSrc.includes('facebook.com'));
  const imageBytes=responses.filter(r=>r.type==='Image').reduce((s,r)=>s+r.bytes,0);
  const row={...task,initial,images,typography,links,errors,broken,responses,imageBytes,pageBytes:responses.reduce((s,r)=>s+r.bytes,0)};rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify({route:task.route,width:task.width,images:images.length,broken:broken.length,errors,imageBytes}));await context.close();
 }
}finally{await browser.close();server.close();}
