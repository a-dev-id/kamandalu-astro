// Compare the complete builds; only homepage hero src attributes may change.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';
import { getHomepageHeroImageUrl } from '../src/utils/homepageHeroImages.js';

const root=process.env.HERO_WEBP_EVIDENCE??'.cache/homepage-hero-webp';
const baseline=JSON.parse(readFileSync(`${root}/baseline.json`));
const before=`${root}/before/site`,after='public_html';
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const changedSources=Object.entries(baseline.hashes).filter(([file,value])=>hash(file)!==value).map(([file])=>file);
const failures=[];
if(JSON.stringify(changedSources)!==JSON.stringify(['src/pages/[lang]/index.astro']))failures.push({field:'unexpected source changes',changedSources});
const routes=walk(before).filter(file=>file.endsWith('.html')).map(file=>path.relative(before,file)).sort();
const afterRoutes=walk(after).filter(file=>file.endsWith('.html')).map(file=>path.relative(after,file)).sort();
if(JSON.stringify(routes)!==JSON.stringify(afterRoutes))failures.push({field:'route inventory'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let changedHeroTags=0,retainedHeroTags=0,unchangedOtherImages=0;
const sharedHeroAssets=[];
try{
  const page=await browser.newPage();
  const parse=html=>page.evaluate(html=>{
    const d=new DOMParser().parseFromString(html,'text/html');
    const sort=values=>values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const images=[...d.images].map(image=>({tag:image.outerHTML,src:image.getAttribute('src'),isHero:!!image.closest('#carousel'),attributes:[...image.attributes].filter(a=>a.name!=='src').map(a=>[a.name,a.value])}));
    return {seo:[...d.querySelectorAll('title,meta,link[rel="canonical"],link[hreflang],script[type="application/ld+json"]')].map(e=>e.outerHTML),scripts:[...d.querySelectorAll('script')].map(e=>e.outerHTML),external:[...d.querySelectorAll('link[href],iframe,noscript')].filter(e=>e.tagName==='NOSCRIPT'||/^(https?:)?\/\//.test(e.getAttribute('src')??e.getAttribute('href')??'')).map(e=>e.outerHTML),images,otherImages:sort(images.filter(i=>!i.isHero).map(i=>i.tag)),links:sort([...d.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),text:e.textContent.trim()}))),localScripts:[...d.querySelectorAll('script[src]')].map(e=>e.getAttribute('src')).filter(src=>src.startsWith('/'))};
  },html);
  for(const route of routes){
    if(!existsSync(path.join(after,route)))continue;
    const a=await parse(readFileSync(path.join(before,route),'utf8')),b=await parse(readFileSync(path.join(after,route),'utf8'));
    for(const field of ['seo','scripts','external','links','otherImages'])if(JSON.stringify(a[field])!==JSON.stringify(b[field]))failures.push({file:route,field});
    const oldHero=a.images.filter(i=>i.isHero),newHero=b.images.filter(i=>i.isHero);
    if(oldHero.length!==newHero.length)failures.push({file:route,field:'hero count'});
    for(let index=0;index<oldHero.length;index++){
      if(newHero[index].src!==getHomepageHeroImageUrl(oldHero[index].src)||JSON.stringify(oldHero[index].attributes)!==JSON.stringify(newHero[index].attributes))failures.push({file:route,field:'hero attributes',index});
      if(newHero[index].src!==oldHero[index].src)changedHeroTags++;else retainedHeroTags++;
      if(a.images.some(image=>!image.isHero&&image.src===oldHero[index].src))sharedHeroAssets.push({route,index,originalUrl:oldHero[index].src});
    }
    unchangedOtherImages+=a.images.filter(i=>!i.isHero).length;
    const modules=(data,dir)=>data.localScripts.map(file=>readFileSync(path.join(dir,file),'utf8'));
    if(JSON.stringify(modules(a,before))!==JSON.stringify(modules(b,after)))failures.push({file:route,field:'compiled browser modules'});
  }
}finally{await browser.close();}
const ignoredBuildArchives=walk(before).filter(file=>file.endsWith('.zip')).map(file=>path.relative(before,file));
const assets=walk(before).filter(file=>!file.endsWith('.html')&&!file.endsWith('.zip'));
const changedAssets=assets.filter(file=>{const relative=path.relative(before,file);return !existsSync(path.join(after,relative))||hash(file)!==hash(path.join(after,relative));}).map(file=>path.relative(before,file));
if(changedAssets.length)failures.push({field:'changed static assets',files:changedAssets});
const result={pages:routes.length,changedSources,changedHeroTags,retainedHeroTags,unchangedOtherImages,sharedHeroAssets,changedAssets,ignoredBuildArchives,failures};
writeFileSync(`${root}/verification.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
