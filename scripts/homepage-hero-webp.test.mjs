import test from 'node:test';
import assert from 'node:assert/strict';
import { getHomepageHeroImageUrl, homepageHeroWebpQualities } from '../src/utils/homepageHeroImages.js';

const original = 'https://cdn.sanity.io/images/6go5cl4m/production/c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77-1920x1080.jpg';

test('homepage hero test adds only the verified WebP quality without resizing or cropping', () => {
  const url = new URL(getHomepageHeroImageUrl(original));
  assert.equal(url.href, original + '?fm=webp&q=82');
  assert.deepEqual([...url.searchParams], [['fm', 'webp'], ['q', '82']]);
  assert.equal(url.pathname, new URL(original).pathname);
});

test('shared originals and unmeasured assets are retained to avoid extra transfers', () => {
  const shared = original.replace('c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77','0396747df20f3b51e91c200a7c8deaf204a3f421');
  assert.equal(getHomepageHeroImageUrl(shared),shared);
  const unknown = original.replace('c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77','unmeasured');
  assert.equal(getHomepageHeroImageUrl(unknown),unknown);
  assert.equal(Object.keys(homepageHeroWebpQualities).length,8);
  assert.ok(Object.values(homepageHeroWebpQualities).every(quality=>quality>=1&&quality<95));
});

test('restoring JPG is exact and existing transforms are preserved', () => {
  assert.equal(getHomepageHeroImageUrl(original, { enabled: false }), original);
  const cropped = original + '?rect=12,34,1800,1000';
  const result = new URL(getHomepageHeroImageUrl(cropped));
  assert.equal(result.searchParams.get('rect'), '12,34,1800,1000');
  assert.equal(result.searchParams.has('w'), false);
  assert.equal(result.searchParams.has('h'), false);
});

test('non-JPG or non-Sanity sources retain original delivery', () => {
  for (const src of ['', '/images/logo.png', original.replace('.jpg', '.png'), original.replace('cdn.sanity.io', 'example.com')]) {
    assert.equal(getHomepageHeroImageUrl(src), src);
  }
});
