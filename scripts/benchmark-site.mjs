// Local validation only. Uses isolated tools; never blocks or changes integrations.
import http from 'node:http';
import path from 'node:path';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import lighthouse from '../.cache/offer-carousel-tools/node_modules/lighthouse/core/index.js';
import { launch } from '../.cache/offer-carousel-tools/node_modules/chrome-launcher/dist/index.js';
const version = process.argv[2];
if(!['before','after'].includes(version))throw Error('Specify before or after');
const root = path.resolve(version === 'before' ? '.cache/site-performance/before/site' : 'public_html');
const output = `.cache/site-performance/${version}/lighthouse`;
mkdirSync(output, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ttf':'font/ttf', '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = http.createServer((req,res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4325');
    const file = path.resolve(root, '.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) throw new Error();
    const body = readFileSync(file);
    res.writeHead(200, {'Content-Type':types[path.extname(file)] ?? 'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(resolve => server.listen(4325,'127.0.0.1',resolve));
const tasks = [];
for(let run=1;run<=5;run++) for(const device of run%2 ? ['mobile','desktop'] : ['desktop','mobile']) tasks.push({route:'/en/',device,run});
for(const route of ['/en/villas/','/en/villa/garden-villa/','/en/ubud-experiences-and-activities/signature-experiences/','/en/dining/petulu-restaurant/','/en/spa-wellness/','/en/wedding-events/','/en/blog/','/en/gallery/']) tasks.push({route,device:'mobile',run:1});
const rows=[];
try {
  for(const task of tasks){
    const chrome = await launch({chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
    try {
      const config = task.device === 'desktop' ? {extends:'lighthouse:default',settings:{formFactor:'desktop',screenEmulation:{mobile:false,width:1350,height:940,deviceScaleFactor:1,disabled:false},emulatedUserAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}} : undefined;
      // No request blocking or third-party overrides in either version.
      const {lhr}=await lighthouse('http://127.0.0.1:4325'+task.route,{port:chrome.port,onlyCategories:['performance'],logLevel:'error',output:'json'},config);
      const name=task.route.replaceAll('/','_')+task.device+'-'+task.run;
      writeFileSync(`${output}/${name}.json`,JSON.stringify(lhr));
      const a=lhr.audits;
      const row={...task,score:lhr.categories.performance.score*100,lcp:a['largest-contentful-paint'].numericValue,tbt:a['total-blocking-time'].numericValue,cls:a['cumulative-layout-shift'].numericValue,speedIndex:a['speed-index'].numericValue,fcp:a['first-contentful-paint'].numericValue,pageBytes:a['total-byte-weight'].numericValue,imageBytes:a['network-requests'].details.items.filter(r=>r.resourceType==='Image').reduce((s,r)=>s+(r.transferSize??0),0),mainThread:a['mainthread-work-breakdown'].numericValue,benchmarkIndex:lhr.environment.benchmarkIndex,lcpElement:a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector,warnings:lhr.runWarnings,error:lhr.runtimeError};
      rows.push(row);writeFileSync(`${output}/summary.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));
    }finally{await chrome.kill();}
  }
}finally{server.close();}
