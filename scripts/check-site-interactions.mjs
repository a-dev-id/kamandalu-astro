// Local validation only. Uses isolated tools; never blocks or changes integrations.
import http from 'node:http';
import path from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '../.cache/offer-carousel-tools/node_modules/playwright/index.mjs';
const version=process.argv[2],root=path.resolve(version==='before'?'.cache/site-performance/before/site':'public_html');
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname,f=path.join(root,p,p.endsWith('/')?'index.html':'');const b=readFileSync(f);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(f)]??'application/octet-stream');res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4326,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[],errors=[];
try{
 for(const width of [390,820,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:width===1440?1:2});
  page.on('pageerror',e=>errors.push({width,message:e.message}));
  const goto=async p=>{await page.goto('http://127.0.0.1:4326'+p,{waitUntil:'load',timeout:90000});await page.evaluate(()=>document.fonts.ready);};
  await goto('/en/');
  const booking=await page.locator('#reserveBtn').getAttribute('href');
  const bookingDates=await page.locator('#flatpickr-date').evaluate(e=>({initialized:!!e._flatpickr,dates:e._flatpickr?.selectedDates.map(d=>e._flatpickr.formatDate(d,'Y-m-d'))}));
  await page.locator('#guests-field').click();
  await page.locator('#adults').selectOption('2');
  await page.locator('#children').selectOption('1');
  const childAgeFields=await page.locator('#child-ages select').count();
  await page.locator('#confirm-guests').click();
  const guestSummary=await page.locator('#guests-input').inputValue();
  await page.locator('#hamburger').click();
  const menuOpened=await page.locator('#offcanvas').evaluate(e=>!e.classList.contains('-translate-x-full'));
  await page.locator('#dining-mobile-toggle').click();
  const diningOpened=await page.locator('#dining-mobile-dropdown').isVisible();
  await page.locator('#closeOffcanvas').click();
  const carousels=[];
  for(const id of ['villa-carousel','offer-carousel','wellness-carousel','culinary-carousel','experience-carousel']){
   if(!await page.locator('#'+id).count())continue;
   const item=await page.locator('#'+id).evaluate(el=>({id:el.id,mounted:el.classList.contains('is-initialized'),first:el.querySelector('.splide__slide.is-active:not(.splide__slide--clone)')?.id,visible:el.querySelectorAll('.splide__slide.is-visible').length}));
   const control=page.locator('#'+id.replace('-carousel','-next'));
   item.disabled=await control.isDisabled();
   if(!item.disabled)await control.click();
   await page.waitForTimeout(900);item.after=await page.locator('#'+id).evaluate(e=>e.querySelector('.splide__slide.is-active:not(.splide__slide--clone)')?.id);carousels.push(item);
  }
  const scrollWork=await page.evaluate(async()=>{
   const old=DOMTokenList.prototype.toggle;let calls=0;
   DOMTokenList.prototype.toggle=function(...args){calls++;return old.apply(this,args);};
   for(let n=0;n<100;n++)window.dispatchEvent(new Event('scroll'));
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   DOMTokenList.prototype.toggle=old;return {toggleCalls:calls};
  });
  await page.evaluate(()=>window.scrollTo(0,200));await page.waitForTimeout(400);
  const scrolled=await page.locator('#navbar').evaluate(e=>({white:e.classList.contains('bg-white'),markVisible:!document.querySelector('#navbar-logo-mark').classList.contains('hidden')}));
  await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(400);
  const atTop=await page.locator('#navbar-logo-full').isVisible();
  let desktopDropdown;
  if(width>=1280){await page.locator('#dining-trigger').hover();desktopDropdown=await page.locator('#dining-dropdown').isVisible();await page.mouse.move(0,800);}
  results.push({width,kind:'navigation',booking,bookingDates,childAgeFields,guestSummary,menuOpened,diningOpened,carousels,scrollWork,scrolled,atTop,desktopDropdown});
  await goto('/en/villa/garden-villa/');await page.locator('#openGallery').click();await page.waitForTimeout(800);
  const modal=await page.locator('#galleryModal').isVisible();
  const modalImage=await page.locator('#galleryCarousel .splide__slide.is-active img').first().evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,src:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth}));
  const previous=await page.locator('#galleryCarousel').evaluate(e=>e.querySelector('.splide__slide.is-active:not(.splide__slide--clone)')?.id);await page.locator('#galleryNext').click();await page.waitForTimeout(900);const next=await page.locator('#galleryCarousel').evaluate(e=>e.querySelector('.splide__slide.is-active:not(.splide__slide--clone)')?.id);await page.locator('#closeGallery').click();
  results.push({width,kind:'villa-modal',modal,modalImage,previous,next,closed:!await page.locator('#galleryModal').isVisible()});
  await goto('/en/gallery/');await page.locator('[data-filter="villa"]').click();
  const filter=await page.locator('.gallery-item').evaluateAll(items=>items.every(i=>i.classList.contains('hidden')===(i.dataset.category!=='villa')));
  await page.locator('.gallery-item:visible').evaluateAll(items=>items.sort((a,b)=>a.dataset.full.split('?')[0].localeCompare(b.dataset.full.split('?')[0]))[0].click());await page.waitForTimeout(1200);
  const galleryModal=await page.locator('#modal-image').evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,src:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth}));await page.locator('#modal-close').click();
  results.push({width,kind:'gallery-modal',filter,galleryModal,closed:!await page.locator('#image-modal').isVisible()});
  await goto('/en/wedding-event/ubud-wedding-venue-and-package/');
  const toggle=page.locator('.toggle-btn').first();let accordion;
  if(await toggle.count()){await toggle.click();accordion=await page.locator('[id^="accordion-"]:not(.hidden)').count();}
  results.push({width,kind:'accordion',openCount:accordion});
  await page.close();
 }
}finally{await browser.close();server.close();}
writeFileSync(`.cache/site-performance/${version}/functional.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
