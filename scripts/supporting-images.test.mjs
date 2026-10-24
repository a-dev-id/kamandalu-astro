import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupportingImage, getSupportingImageSizes, supportingImageLayouts } from '../src/utils/supportingImages.js';
import { getOfferCarouselImage } from '../src/utils/offerCarouselImages.js';

const image = (width, height, crop) => ({
  _type: 'image', crop,
  hotspot: { x: 0.7, y: 0.6, width: 0.2, height: 0.3 },
  asset: {
    _id: `image-687e03548016958f1f0c8bfe8e9b5971edc8cfc3-${width}x${height}-jpg`,
    url: `https://cdn.sanity.io/images/6go5cl4m/production/687e03548016958f1f0c8bfe8e9b5971edc8cfc3-${width}x${height}.jpg`,
    metadata: { dimensions: { width, height } },
  },
});

test('every supporting role caps unique candidates to the authored crop and preserves source metadata', () => {
  for (const layout of Object.keys(supportingImageLayouts)) {
    for (const source of [image(180, 120), image(4000, 3000), image(1001, 600, { left: 0.123, right: 0.234, top: 0.1, bottom: 0.2 })]) {
      const snapshot = structuredClone(source);
      const result = getSupportingImage(source, { layout });
      const candidates = result.srcset.split(', ').map(entry => entry.split(' '));
      assert.equal(new Set(candidates.map(([, width]) => width)).size, candidates.length);
      for (const [url, descriptor] of candidates) {
        const params = new URL(url).searchParams;
        const rect = params.get('rect')?.split(',').map(Number);
        const width = Number.parseInt(descriptor, 10);
        assert.ok(width <= (rect?.[2] ?? source.asset.metadata.dimensions.width));
        assert.equal(params.get('w'), String(width));
        assert.equal(params.get('auto'), 'format');
        assert.equal(params.get('fit'), 'max');
        assert.equal(params.get('q'), '80');
        assert.equal(params.has('h'), false);
        if (source.crop) assert.deepEqual(rect, [123, 60, 644, 420]);
      }
      assert.deepEqual(source, snapshot);
    }
  }
});

test('thumbnail quality, unknown metadata fallback and explicit role boundary', () => {
  const source = image(1200, 800);
  assert.equal(new URL(getSupportingImage(source, { layout: 'gallery-thumb', quality: 78 }).src).searchParams.get('q'), '78');
  delete source.asset.metadata;
  assert.deepEqual(getSupportingImage(source, { layout: 'card-grid' }), { src: source.asset.url });
  assert.throws(() => getSupportingImage(source, { layout: 'hero' }), /Unknown/);
  assert.throws(() => getSupportingImageSizes('hero', 1.5), /Unknown/);
  assert.deepEqual(getSupportingImage(null, { layout: 'card-grid' }), { src: '' });
});

test('existing Offer Carousel policy is reused unchanged only for matching supporting cards', () => {
  const source = image(1920, 1080);
  assert.deepEqual(getSupportingImage(source, { layout: 'home-three' }), getOfferCarouselImage(source));
  assert.match(getSupportingImageSizes('villa-preview', 1.5), /1.5 \+ 1rem/);
  assert.equal(getSupportingImageSizes('villa-lightbox', 1.5), '(min-width: 1056px) 57rem, calc(100vw - 9rem)');
  // A width-descriptor srcset also determines the intrinsic width of an img
  // without CSS width. Small gallery originals must retain that visual size.
  assert.match(getSupportingImage(image(330, 200), { layout: 'gallery-lightbox' }).sizes, /^min\(330px,/);
});

test('already-downloaded hero originals are reused without discarding authored crops', () => {
  const source = image(1920, 1080);
  const reuseUrls = [source.asset.url];
  assert.deepEqual(getSupportingImage(source, { layout: 'dining-gallery', reuseUrls }), { src: source.asset.url });
  source.crop = { left: 0.1, right: 0, top: 0, bottom: 0 };
  assert.ok(getSupportingImage(source, { layout: 'dining-gallery', reuseUrls }).srcset);
});
