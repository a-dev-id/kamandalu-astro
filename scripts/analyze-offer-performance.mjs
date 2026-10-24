import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const directory = path.resolve(process.argv[2] ?? '.cache/offer-investigation');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const rows = readJson(path.join(directory, 'runs.json'));
const manifest = readJson(path.join(directory, 'manifest.json'));
const quantile = (values, percentile) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const low = Math.floor(position);
  return sorted[low] + (sorted[Math.ceil(position)] - sorted[low]) * (position - low);
};
const median = values => quantile(values, 0.5);
const stats = values => ({ n: values.length, min: Math.min(...values), q1: quantile(values, 0.25), median: median(values), q3: quantile(values, 0.75), max: Math.max(...values) });
function normalizeUrl(value) {
  if (!value || value === 'Unattributable') return value ?? 'Unattributable';
  try {
    const url = new URL(value);
    const origin = url.hostname === '127.0.0.1' ? 'local' : url.origin;
    return origin + url.pathname + (url.searchParams.has('id') ? `?id=${url.searchParams.get('id')}` : '');
  } catch { return value; }
}

const records = rows.map(row => {
  const lhr = readJson(path.join(directory, 'raw', `${row.name}.lhr.json`));
  const audits = lhr.audits;
  const longTasks = audits['long-tasks'].details.debugData;
  const metrics = audits.metrics.details.items[0];
  const parties = audits['third-party-summary'].details.items;
  const blockingByUrl = {};
  for (const entity of parties) for (const item of entity.subItems?.items ?? []) {
    const url = normalizeUrl(item.url);
    const current = blockingByUrl[url] ?? { cpu: 0, blocking: 0, bytes: 0 };
    current.cpu += item.mainThreadTime ?? 0;
    current.blocking += item.blockingTime ?? 0;
    current.bytes += item.transferSize ?? 0;
    blockingByUrl[url] = current;
  }
  const bootupByUrl = {};
  for (const item of audits['bootup-time'].details.items) {
    const url = normalizeUrl(item.url);
    const current = bootupByUrl[url] ?? { cpu: 0, scripting: 0, parseCompile: 0 };
    current.cpu += item.total;
    current.scripting += item.scripting;
    current.parseCompile += item.scriptParseCompile;
    bootupByUrl[url] = current;
  }
  const tasks = longTasks.tasks.map(task => ({
    url: normalizeUrl(longTasks.urls[task.urlIndex]),
    start: task.startTime, duration: task.duration,
  }));
  const insight = audits['lcp-breakdown-insight']?.details?.items?.find(item => item.type === 'table')?.items ?? [];
  const legacyPhases = audits['largest-contentful-paint-element']?.details?.items?.find(item => item.type === 'table' && item.headings?.some(h => h.key === 'phase'))?.items ?? [];
  const requests = audits['network-requests'].details.items;
  return {
    ...row,
    weightedScores: lhr.categories.performance.auditRefs.filter(ref => ref.weight).map(ref => ({ metric: ref.id, weight: ref.weight, score: audits[ref.id].score, points: ref.weight * audits[ref.id].score })),
    work: Object.fromEntries(audits['mainthread-work-breakdown'].details.items.map(item => [item.group, item.duration])),
    parties: parties.filter(item => item.mainThreadTime || item.blockingTime).map(item => ({ entity: item.entity, cpu: item.mainThreadTime, blocking: item.blockingTime, bytes: item.transferSize })),
    blockingByUrl, bootupByUrl,
    longTaskCount: tasks.length, longestTask: Math.max(0, ...tasks.map(task => task.duration)), tasks,
    lcpObservedBreakdown: Object.fromEntries(insight.map(item => [item.subpart, item.duration])),
    lcpSimulatedBreakdown: Object.fromEntries(legacyPhases.map(item => [item.phase, item.timing])),
    observed: Object.fromEntries(['observedFirstContentfulPaint', 'observedLargestContentfulPaint', 'observedDomContentLoaded', 'observedTraceEnd', 'observedLastVisualChange', 'observedSpeedIndex'].map(key => [key, metrics[key]])),
    scriptRequests: requests.filter(item => item.resourceType === 'Script').map(item => ({ url: normalizeUrl(item.url), bytes: item.transferSize, start: item.startTime, end: item.endTime, status: item.statusCode, protocol: item.protocol })),
    consoleErrors: audits['errors-in-console']?.details?.items ?? [],
  };
});

const groups = {};
for (const mode of ['live', 'blocked']) for (const version of ['original', 'optimized']) {
  const selected = records.filter(row => row.mode === mode && row.version === version);
  if (!selected.length) continue;
  const group = {};
  for (const key of ['score', 'fcp', 'lcp', 'tbt', 'cls', 'speedIndex', 'pageBytes', 'imageBytes', 'offerBytes', 'mainThread', 'benchmarkIndex', 'longTaskCount', 'longestTask']) group[key] = stats(selected.map(row => row[key]));
  group.work = Object.fromEntries([...new Set(selected.flatMap(row => Object.keys(row.work)))].map(key => [key, stats(selected.map(row => row.work[key] ?? 0))]));
  const entities = [...new Set(selected.flatMap(row => row.parties.map(item => item.entity)))];
  group.parties = entities.map(entity => ({ entity, cpu: stats(selected.map(row => row.parties.find(item => item.entity === entity)?.cpu ?? 0)), blocking: stats(selected.map(row => row.parties.find(item => item.entity === entity)?.blocking ?? 0)) })).sort((a, b) => b.blocking.median - a.blocking.median);
  const urls = [...new Set(selected.flatMap(row => Object.keys(row.bootupByUrl)))];
  group.scripts = urls.map(url => ({
    url, cpu: stats(selected.map(row => row.bootupByUrl[url]?.cpu ?? 0)),
    scripting: stats(selected.map(row => row.bootupByUrl[url]?.scripting ?? 0)),
    parseCompile: stats(selected.map(row => row.bootupByUrl[url]?.parseCompile ?? 0)),
    blocking: stats(selected.map(row => row.blockingByUrl[url]?.blocking ?? 0)),
    cpuReportedInRuns: selected.filter(row => row.bootupByUrl[url]).length,
  })).sort((a, b) => b.cpu.median - a.cpu.median);
  group.lcpElements = Object.fromEntries([...new Set(selected.map(row => row.lcpSelector))].map(selector => [selector, selected.filter(row => row.lcpSelector === selector).length]));
  group.lateVisualChangeRuns = selected.filter(row => row.observed.observedLastVisualChange >= 5000).map(row => row.name);
  groups[`${mode}-${version}`] = group;
}

// Exploratory paired bootstrap intervals. All completed runs are retained.
let seed = 301023;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const paired = {};
for (const mode of ['live', 'blocked']) {
  const pairs = [...new Set(rows.filter(row => row.mode === mode).map(row => row.pair))].map(pair => ({
    original: rows.find(row => row.mode === mode && row.pair === pair && row.version === 'original'),
    optimized: rows.find(row => row.mode === mode && row.pair === pair && row.version === 'optimized'),
  })).filter(pair => pair.original && pair.optimized);
  if (!pairs.length) continue;
  paired[mode] = {};
  for (const key of ['score', 'lcp', 'tbt', 'speedIndex', 'offerBytes']) {
    const differences = pairs.map(pair => pair.optimized[key] - pair.original[key]);
    const resamples = Array.from({ length: 10000 }, () => median(Array.from({ length: pairs.length }, () => differences[Math.floor(random() * pairs.length)])));
    paired[mode][key] = { difference: stats(differences), medianDifference95PercentBootstrapInterval: [quantile(resamples, 0.025), quantile(resamples, 0.975)] };
  }
}

const result = {
  generatedAt: new Date().toISOString(), manifest,
  definitions: {
    original: 'Recorded pre-Phase-1 offer img tags inside the SAME current production document and assets.',
    optimized: 'Unmodified current Phase-1 production document.',
    blocking: 'Third-party attribution audit blocking time over its analysis window; not an exact allocation of the displayed simulated TBT. Do not add it to or subtract it from TBT.',
    cpu: 'Lighthouse bootup/main-thread audit CPU timings under the configured simulated mobile slowdown.',
    statistics: 'Linear-interpolated quartiles and even-sample median. Paired differences are optimized minus original. Bootstrap intervals are exploratory and do not eliminate host/network/remote-script variation.',
  },
  groups, paired, runs: records,
};
writeFileSync(path.join(directory, 'analysis.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ completedRuns: rows.length, groups: Object.fromEntries(Object.entries(groups).map(([key, group]) => [key, Object.fromEntries(['score', 'lcp', 'tbt', 'speedIndex', 'offerBytes', 'benchmarkIndex'].map(metric => [metric, group[metric]]))])), paired }, null, 2));
