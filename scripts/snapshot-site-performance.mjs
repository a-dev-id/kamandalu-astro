// Capture before editing. Existing evidence is protected against overwrites.
import { existsSync, cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = '.cache/site-performance';
if(existsSync(`${root}/before/manifest.json`))throw Error('Baseline already exists; archive it before taking a new snapshot');
mkdirSync(`${root}/before`, { recursive: true });
cpSync('public_html', `${root}/before/site`, { recursive: true });
cpSync('src', `${root}/before/source`, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const files = {};
function visit(dir) { for (const f of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) visit(p); else files[p.replaceAll('\\', '/')] = hash(readFileSync(p)); } }
visit('src');
for (const p of ['package.json', 'package-lock.json', 'astro.config.mjs']) files[p] = hash(readFileSync(p));
writeFileSync(`${root}/before/manifest.json`, JSON.stringify({ date: new Date().toISOString(), node: process.version, files }, null, 2));
console.log(`Saved current production build and ${Object.keys(files).length} source/configuration hashes`);
