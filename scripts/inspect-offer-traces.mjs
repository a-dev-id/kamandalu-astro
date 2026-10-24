import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const directory = path.resolve(process.argv[2] ?? '.cache/offer-investigation');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const manifest = readJson(path.join(directory, 'manifest.json'));
const runs = readJson(path.join(directory, 'runs.json'));
const html = readFileSync(path.join(directory, 'original.html'), 'utf8');
const start = html.indexOf('id="offer-carousel"');
const offerPaths = [...html.slice(start, html.indexOf('id="offer-prev"', start)).matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(match => new URL(match[1]).pathname);
function cleanUrl(value) {
  try {
    const url = new URL(value);
    return url.origin + url.pathname + (url.searchParams.has('id') ? `?id=${url.searchParams.get('id')}` : '');
  } catch { return value; }
}
const result = [];
for (const run of runs) {
  const trace = JSON.parse(gunzipSync(readFileSync(path.join(directory, 'raw', `${run.name}.trace.json.gz`))));
  const events = trace.traceEvents;
  const navigation = events.find(event => event.name === 'navigationStart' && event.args?.data?.documentLoaderURL === manifest.url);
  if (!navigation) throw new Error(`Main-frame navigation missing: ${run.name}`);
  const main = event => event.pid === navigation.pid && event.tid === navigation.tid;
  const decodes = events.filter(event => event.name === 'Decode Image' && event.ph === 'X');
  const byType = {};
  for (const event of decodes) {
    const type = event.args?.imageType ?? 'unknown';
    const current = byType[type] ?? { events: 0, mainThreadEvents: 0, mainThreadCpuMs: 0, otherThreadCpuMs: 0 };
    current.events++;
    if (main(event)) { current.mainThreadEvents++; current.mainThreadCpuMs += (event.tdur ?? event.dur ?? 0) / 1000; }
    else current.otherThreadCpuMs += (event.tdur ?? event.dur ?? 0) / 1000;
    byType[type] = current;
  }
  const paints = events.filter(event => event.name === 'PaintImage' && main(event));
  const candidates = events.filter(event => /largestContentfulPaint::Candidate|LargestImagePaint::Candidate/.test(event.name) && main(event));
  const log = JSON.parse(gunzipSync(readFileSync(path.join(directory, 'raw', `${run.name}.devtools.json.gz`))));
  const dynamicAds = log.filter(event => event.method === 'Network.requestWillBeSent' && /gtag\/(js|destination).*id=AW/.test(event.params.request.url)).map(({ params }) => ({
    url: cleanUrl(params.request.url),
    initiatorType: params.initiator.type,
    stack: params.initiator.stack?.callFrames?.slice(0, 4).map(frame => ({ function: frame.functionName, url: cleanUrl(frame.url) })),
    parent: params.initiator.stack?.parent?.callFrames?.slice(0, 3).map(frame => ({ function: frame.functionName, url: cleanUrl(frame.url) })),
  }));
  result.push({
    run: run.name, mode: run.mode, version: run.version,
    recordedImageDecodes: byType,
    offerPaintEventsOnMainThread: paints.filter(event => offerPaths.some(p => event.args?.data?.url?.includes(p))).length,
    lcpCandidates: candidates.map(event => ({ timeMs: (event.ts - navigation.ts) / 1000, name: event.name, data: event.args?.data })),
    dynamicGoogleAdsInitiators: dynamicAds,
    blockedTrackingScriptResponses: log.filter(event => event.method === 'Network.responseReceived' && event.params.type === 'Script' && manifest.blockedDomains.some(domain => event.params.response.url.includes(domain))).map(event => cleanUrl(event.params.response.url)),
  });
}
writeFileSync(path.join(directory, 'trace-review.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  traces: result.length,
  mainThreadImageDecodeEvents: result.reduce((sum, row) => sum + Object.values(row.recordedImageDecodes).reduce((total, item) => total + item.mainThreadEvents, 0), 0),
  recordedDecodeTypes: [...new Set(result.flatMap(row => Object.keys(row.recordedImageDecodes)))],
  offerPaintEventsOnMainThread: result.reduce((sum, row) => sum + row.offerPaintEventsOnMainThread, 0),
  blockedRunsWithTrackingScriptResponses: result.filter(row => row.mode === 'blocked' && row.blockedTrackingScriptResponses.length).map(row => row.run),
  observedGoogleAdsIds: [...new Set(result.flatMap(row => row.dynamicGoogleAdsInitiators.map(item => item.url)))],
}, null, 2));
