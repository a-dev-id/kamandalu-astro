// Local fixture only: supporting-image tags on the otherwise frozen baseline.
// No hero or third-party script substitutions.
import { cpSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = '.cache/site-performance/desktop-images-only';
mkdirSync(root, { recursive: true });
cpSync('.cache/site-performance/before/site', root, { recursive: true });
const original = readFileSync(`${root}/en/index.html`, 'utf8');
const optimized = readFileSync('public_html/en/index.html', 'utf8');
const imageTags = html => [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
const before = imageTags(original);
const after = imageTags(optimized);
assert.equal(before.length, after.length);
let index = 0;
const fixture = original.replace(/<img\b[^>]*>/g, tag => {
  const replacement = after[index++];
  return replacement.includes('data-image-layout') ? replacement : tag;
});
assert.deepEqual(imageTags(fixture).filter(tag => tag.includes('width="1600"')), before.filter(tag => tag.includes('width="1600"')));
const scripts = html => [...html.matchAll(/<script\b[\s\S]*?<\/script>/g)].map(match => match[0]);
assert.deepEqual(scripts(fixture), scripts(original));
writeFileSync(`${root}/en/index.html`, fixture);
console.log('Prepared supporting-images-only fixture; scripts, CSS, fonts and heroes retain their baseline versions.');
