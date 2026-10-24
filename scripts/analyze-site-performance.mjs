// Local validation only. Uses isolated tools; never blocks or changes integrations.
import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const json=p=>JSON.parse(readFileSync(p));
const root='.cache/site-performance';
const stats=values=>{const s=values.toSorted((a,b)=>a-b);const quantile=p=>{const i=(s.length-1)*p;return s[Math.floor(i)]+(s[Math.ceil(i)]-s[Math.floor(i)])*(i%1);};return {median:quantile(.5),min:s[0],max:s.at(-1),q1:quantile(.25),q3:quantile(.75),values};};
const browser={before:json(`${root}/before/browser/results.json`),after:json(`${root}/after/browser/results.json`)};
const comparisons=[];
for(const b of browser.after){
 const a=browser.before.find(a=>a.route===b.route&&a.width===b.width);if(!a)continue;
 const geometry=[];
 for(let i=0;i<Math.min(a.initial.images.length,b.initial.images.length);i++){
  const x=a.initial.images[i],y=b.initial.images[i];
  if(Math.abs(x.width-y.width)>.5||Math.abs(x.height-y.height)>.5||Math.abs(x.top-y.top)>1)geometry.push({image:i,before:x,after:y});
 }
 comparisons.push({route:b.route,width:b.width,before:a.imageBytes,after:b.imageBytes,saved:a.imageBytes-b.imageBytes,percent:100*(a.imageBytes-b.imageBytes)/a.imageBytes,typographyEqual:JSON.stringify(a.typography)===JSON.stringify(b.typography),geometryDifferences:geometry,errors:b.errors,broken:b.broken});
}
const formats={};
for(const r of browser.after)for(const response of r.responses.filter(r=>r.type==='Image'&&r.url.includes('auto=format'))){formats[response.mime]=(formats[response.mime]??0)+1;}
const assets={};
for(const [version,dir] of [['before',`${root}/before/site`],['after','public_html']]){
 const html=readFileSync(path.join(dir,'en/index.html'),'utf8');
 const files=[...new Set([...html.matchAll(/(?:href|src)="(\/_astro\/[^" ]+\.(?:css|js))"/g)].map(x=>x[1]))];
 assets[version]=files.map(file=>({file,bytes:statSync(path.join(dir,file)).size,gzip:gzipSync(readFileSync(path.join(dir,file))).length}));
}
const protectedFiles={};
for(const file of ['sitemap-index.xml','sitemap-0.xml','images/kamandalu-logo.png',...['MrEavesModOTReg','MrEavesModOTBold','Plantin','PlantinLight'].map(name=>`fonts/${name}.ttf`)])protectedFiles[file]=readFileSync(path.join(root,'before/site',file)).equals(readFileSync('public_html/'+file));
const lighthouse={};
for(const version of ['before','after']){
 const file=`${root}/${version}/lighthouse/summary.json`;if(!existsSync(file))continue;
 const rows=json(file);lighthouse[version]={};
 for(const device of ['mobile','desktop']){
  const home=rows.filter(r=>r.route==='/en/'&&r.device===device);
  lighthouse[version][device]=Object.fromEntries(['score','lcp','tbt','cls','speedIndex','fcp','imageBytes','pageBytes','mainThread','benchmarkIndex'].map(key=>[key,stats(home.map(r=>r[key]))]));
  lighthouse[version][device].lcpElements=home.map(r=>r.lcpElement);
 }
 lighthouse[version].internal=rows.filter(r=>r.route!=='/en/');
}
const pairedFile=`${root}/paired/summary.json`;
const pairedLighthouse={};
if(existsSync(pairedFile)){
 const rows=json(pairedFile);
 for(const version of ['before','after']){
  pairedLighthouse[version]={};
  for(const device of ['mobile','desktop']){
   const subset=rows.filter(r=>r.version===version&&r.device===device);
   pairedLighthouse[version][device]=Object.fromEntries(['score','lcp','tbt','cls','speedIndex','fcp','imageBytes','pageBytes','mainThread','benchmarkIndex'].map(key=>[key,stats(subset.map(r=>r[key]))]));
   pairedLighthouse[version][device].lcpElements=subset.map(r=>({run:r.run,selector:r.lcpElement}));
  }
 }
}
const diagnostics={};
for(const [label,directory,pattern] of [['initialBefore',`${root}/before/lighthouse`,/^_en_mobile-/],['initialAfter',`${root}/after/lighthouse`,/^_en_mobile-/],['pairedBefore',`${root}/paired`,/^before-mobile-/],['pairedAfter',`${root}/paired`,/^after-mobile-/]]){
 if(!existsSync(directory))continue;
 const reports=readdirSync(directory).filter(name=>pattern.test(name)).map(name=>json(path.join(directory,name)));
 const entities=[...new Set(reports.flatMap(r=>r.audits['third-party-summary']?.details?.items.map(i=>i.entity)??[]))];
 const normalize=url=>{try{const u=new URL(url);return u.origin+u.pathname+(u.searchParams.has('id')?'?id='+u.searchParams.get('id'):'');}catch{return url;}};
 const scriptRows=reports.map(r=>{
  const mapped={};for(const i of r.audits['bootup-time'].details.items){const key=normalize(i.url);mapped[key]=(mapped[key]??0)+i.scripting+i.scriptParseCompile;}return mapped;
 });
 const scriptNames=[...new Set(scriptRows.flatMap(r=>Object.keys(r)))];
 diagnostics[label]={runs:reports.length,entities:entities.map(entity=>({entity,blocking:stats(reports.map(r=>r.audits['third-party-summary'].details.items.find(i=>i.entity===entity)?.blockingTime??0))})).sort((a,b)=>b.blocking.median-a.blocking.median),scripts:scriptNames.map(url=>({url,cpu:stats(scriptRows.map(r=>r[url]??0))})).sort((a,b)=>b.cpu.median-a.cpu.median),mainThreadGroups:Object.fromEntries(['scriptEvaluation','scriptParseCompile','styleLayout','parseHTML','paintCompositeRender'].map(group=>[group,stats(reports.map(r=>r.audits['mainthread-work-breakdown'].details.items.find(i=>i.group===group)?.duration??0))])),longTasks:stats(reports.map(r=>r.audits['main-thread-tasks'].details.items.filter(i=>i.duration>50).length))};
}
const functionalBefore=json(`${root}/before/functional.json`),functionalAfter=json(`${root}/after/functional.json`);
const functionalIssues=[];
for(const r of functionalAfter.results){
 const a=functionalBefore.results.find(a=>a.width===r.width&&a.kind===r.kind);
 if(r.kind==='navigation'){
  if(!r.menuOpened||!r.diningOpened||!r.scrolled.white||!r.scrolled.markVisible||!r.atTop||(r.width===1440&&!r.desktopDropdown)||r.booking!==a.booking||!r.bookingDates.initialized||r.bookingDates.dates.length!==2||r.childAgeFields!==1)functionalIssues.push(r);
  for(const c of r.carousels){const old=a.carousels.find(x=>x.id===c.id);if(!c.mounted||c.visible!==old.visible||c.disabled!==old.disabled||!c.after||(!c.disabled&&c.after===c.first))functionalIssues.push(c);}
 }
 if(r.kind.includes('modal')){
  if(!r.closed||(r.kind==='gallery-modal'&&!r.filter))functionalIssues.push(r);
  for(const key of ['modalImage','galleryModal'])if(r[key]&&(r[key].width!==a[key].width||r[key].height!==a[key].height||!r[key].complete||!r[key].naturalWidth))functionalIssues.push(r);
 }
 if(r.kind==='accordion'&&r.openCount!==1)functionalIssues.push(r);
}
const functional={errors:functionalAfter.errors,issues:functionalIssues,scrollWork: functionalAfter.results.filter(r=>r.kind==='navigation').map(r=>({width:r.width,before:functionalBefore.results.find(a=>a.width===r.width&&a.kind==='navigation').scrollWork.toggleCalls,after:r.scrollWork.toggleCalls}))};
const output={comparisons,formats,assets,protectedFiles,lighthouse,pairedLighthouse,diagnostics,functional,browserVisits:{before:browser.before.length,after:browser.after.length},imageBytesAcrossPairedVisits:{before:comparisons.reduce((s,r)=>s+r.before,0),after:comparisons.reduce((s,r)=>s+r.after,0)}};
writeFileSync(`${root}/analysis.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify({visits:output.browserVisits,formats,assets,protectedFiles,imageBytesAcrossPairedVisits:output.imageBytesAcrossPairedVisits,regressions:comparisons.filter(r=>r.geometryDifferences.length||!r.typographyEqual||r.errors.length||r.broken.length),lighthouse},null,2));
