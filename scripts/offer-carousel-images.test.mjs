import test from 'node:test';
import assert from 'node:assert/strict';
import { getOfferCarouselImage } from '../src/utils/offerCarouselImages.js';

function image(width, height, crop, hotspot) {
  return {
    _type: 'image', crop, hotspot,
    asset: {
      _id: `image-687e03548016958f1f0c8bfe8e9b5971edc8cfc3-${width}x${height}-jpg`,
      url: `https://cdn.sanity.io/images/6go5cl4m/production/687e03548016958f1f0c8bfe8e9b5971edc8cfc3-${width}x${height}.jpg`,
      metadata: { dimensions: { width, height } },
    },
  };
}

const candidates = result => result.srcset.split(', ').map(entry => {
  const [url, descriptor] = entry.split(' ');
  return { url: new URL(url), width: Number.parseInt(descriptor, 10) };
});

test('offer candidates preserve proportions and use the isolated CDN policy', () => {
  const original = image(1920, 1080);
  const snapshot = structuredClone(original);
  const result = getOfferCarouselImage(original);
  assert.deepEqual(candidates(result).map(c => c.width), [320, 480, 640, 800, 960, 1280, 1536, 1760]);
  for (const { url, width } of candidates(result)) {
    assert.equal(Number(url.searchParams.get('w')), width);
    assert.equal(url.searchParams.get('auto'), 'format');
    assert.equal(url.searchParams.get('q'), '80');
    assert.equal(url.searchParams.get('fit'), 'max');
    assert.equal(url.searchParams.has('h'), false);
    assert.equal(url.searchParams.has('rect'), false);
  }
  assert.deepEqual(original, snapshot);
  assert.ok(result.sizes.endsWith('calc((100vw - 2rem) * 1.3333333333333333)'));
});

test('small and cropped sources never get oversized or duplicate descriptors', () => {
  for (const source of [image(240, 160), image(1000, 600), image(1001, 600, {left: 0.123, right: 0.234, top: 0.1, bottom: 0.2}, {x: 0.7, y: 0.5, width: 0.2, height: 0.3})]) {
    const snapshot = structuredClone(source);
    const result = getOfferCarouselImage(source);
    const variants = candidates(result);
    assert.equal(new Set(variants.map(c => c.width)).size, variants.length);
    for (const { url, width } of variants) {
      const rect = url.searchParams.get('rect')?.split(',').map(Number);
      const availableWidth = rect?.[2] ?? source.asset.metadata.dimensions.width;
      assert.ok(width <= availableWidth);
      assert.equal(Number(url.searchParams.get('w')), width);
      if (source.crop) assert.deepEqual(rect, [123, 60, 644, 420]);
    }
    assert.deepEqual(source, snapshot);
  }
});

test('unknown image dimensions retain the original URL without a misleading srcset', () => {
  const source = image(1920, 1080);
  delete source.asset.metadata;
  assert.deepEqual(getOfferCarouselImage(source), { src: source.asset.url });
  assert.deepEqual(getOfferCarouselImage(null), { src: '' });
});
