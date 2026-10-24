// Local validation only. Uses isolated tools; never blocks or changes integrations.
import {readFileSync,readdirSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';
const before='.cache/site-performance/before/site',after='public_html';
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest=JSON.parse(readFileSync('.cache/site-performance/before/manifest.json'));
const unchanged=['package.json','package-lock.json','astro.config.mjs','src/components/OptimizedImage.astro','src/components/OfferCarouselImage.astro','src/utils/offerCarouselImages.js'].filter(p=>manifest.files[p]);
const failures=[];
for(const p of unchanged)if(hash(p)!==manifest.files[p])failures.push({file:p,field:'protected source or dependencies'});
const routes=walk(before).filter(p=>p.endsWith('.html')).map(p=>path.relative(before,p));
const actualRoutes=walk(after).filter(p=>p.endsWith('.html')).map(p=>path.relative(after,p));
if(JSON.stringify(routes.sort())!==JSON.stringify(actualRoutes.sort()))failures.push({field:'route inventory'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let protectedImages=0,supportingImages=0,responsiveImages=0,reusedHeroImages=0;const assets=new Set(),profiles={},changedFiles=[];
try{
 const page=await browser.newPage();
 for(const route of routes){
  if(!existsSync(path.join(after,route))){failures.push({file:route,field:'missing page'});continue;}
  const parse=html=>page.evaluate(html=>{
   const d=new DOMParser().parseFromString(html,'text/html');
   const sorted=values=>values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
   const remote=value=>/^(https?:)?\/\//.test(value??'');
   const seo=Array.from(d.querySelectorAll('title,meta,link[rel="canonical"],link[hreflang],script[type="application/ld+json"]')).map(e=>e.outerHTML);
   const thirdParty=Array.from(d.querySelectorAll('script,iframe,link,noscript')).filter(e=>e.tagName==='NOSCRIPT'||remote(e.getAttribute('src')??e.getAttribute('href'))||(e.tagName==='SCRIPT'&&/gtag|googletagmanager|triptease|contentsquare|fbq\(|book-secure/.test(e.textContent))).map(e=>e.outerHTML);
   const heroes=Array.from(d.querySelectorAll('img[width="1600"]')).map(e=>e.outerHTML);
   const offers=Array.from(d.querySelectorAll('#offer-carousel img')).map(e=>e.outerHTML);
   const links=sorted(Array.from(d.querySelectorAll('a')).map(e=>({href:e.getAttribute('href'),text:e.textContent.trim()})));
   const supporting=Array.from(d.querySelectorAll('img[data-image-layout]')).map(e=>({src:e.getAttribute('src'),srcset:e.getAttribute('srcset'),sizes:e.getAttribute('sizes'),role:e.dataset.imageLayout}));
   const localScripts=Array.from(d.querySelectorAll('script[src]')).map(e=>e.getAttribute('src')).filter(src=>src.startsWith('/'));
   d.querySelectorAll('script,style,noscript').forEach(e=>e.remove());
   const text=d.body.textContent.replace(/\s+/g,' ').trim();
   return {seo,thirdParty,heroes,offers,links,supporting,localScripts,text};
  },html);
  const a=await parse(readFileSync(path.join(before,route),'utf8')),b=await parse(readFileSync(path.join(after,route),'utf8'));
  for(const field of ['seo','thirdParty','heroes','offers','links','text'])if(JSON.stringify(a[field])!==JSON.stringify(b[field]))failures.push({file:route,field});
  protectedImages+=a.heroes.length;
  for(const i of b.supporting){supportingImages++;if(i.srcset)responsiveImages++;else reusedHeroImages++;assets.add(new URL(i.src).pathname);profiles[i.role]=(profiles[i.role]??0)+1;if((!i.srcset||!i.sizes)&&!b.heroes.some(tag=>tag.includes(`src="${i.src}"`)))failures.push({file:route,field:'support metadata',image:i});}
  // Compiled modules containing integrations must also remain byte-identical.
  const integrationModules=(data,root)=>data.localScripts.map(p=>readFileSync(path.join(root,p),'utf8')).filter(s=>/gtag|contentsquare|googletagmanager|triptease/.test(s)).sort();
  if(JSON.stringify(integrationModules(a,before))!==JSON.stringify(integrationModules(b,after)))failures.push({file:route,field:'compiled integration modules'});
 }
}finally{await browser.close();}
for(const p of Object.keys(manifest.files).filter(p=>p.startsWith('src/')))if(existsSync(p)&&hash(p)!==manifest.files[p])changedFiles.push(p);
for(const p of walk('src'))if(!manifest.files[p.replaceAll('\\','/')])changedFiles.push(p.replaceAll('\\','/'));
const report={pages:routes.length,protectedImages,supportingImages,responsiveImages,reusedHeroImages,uniqueSupportingAssets:assets.size,profiles,unchanged,changedFiles,failures};
mkdirSync('.cache/site-performance/after',{recursive:true});writeFileSync('.cache/site-performance/after/static-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
