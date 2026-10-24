import { createImageUrlBuilder } from '@sanity/image-url';
import client from '../lib/sanityClient.js';
import { getOfferCarouselImage } from './offerCarouselImages.js';

// Explicit supporting-image roles only. Headers/hero fallbacks keep their renderer.
const builder = createImageUrlBuilder(client);
const widths = [240, 320, 480, 640, 800, 960, 1280, 1600, 1920, 2560, 3072];
const containers = [[0, 0], [640, 640], [768, 768], [1024, 1024], [1280, 1280], [1536, 1536]];
const widePadding = [[0, 16], [1280, 40], [1536, 0]];
const standardPadding = [[0, 16]];
const carouselColumns = [[0, 1], [769, 2], [1025, 3]];
const carouselGap = [[0, 32], [1367, 64]];
const responsiveCardRatio = [[0, 4 / 3], [768, 3 / 2]];

// Values describe existing CSS/Splide layout, not a new design system.
export const supportingImageLayouts = {
  'home-two': { padding: widePadding, columns: [[0, 1], [769, 2]], gap: carouselGap, ratio: responsiveCardRatio },
  'home-three': { padding: widePadding, columns: carouselColumns, gap: carouselGap, ratio: responsiveCardRatio },
  'carousel-three': { padding: standardPadding, columns: carouselColumns, gap: carouselGap, ratio: [[0, 4 / 3]] },
  'carousel-two': { padding: standardPadding, columns: [[0, 1], [769, 2]], gap: carouselGap, ratio: [[0, 4 / 3]] },
  'wide-carousel-three': { padding: widePadding, columns: carouselColumns, gap: carouselGap, ratio: [[0, 4 / 3]] },
  'dining-gallery': { padding: [[0, 0]], columns: carouselColumns, gap: [[0, 32]], ratio: [[0, 4 / 3]] },
  'villa-list': { padding: standardPadding, columns: [[0, 1], [1024, 2]], gap: [[0, 40]], ratio: [[0, 4 / 3]] },
  'card-grid': { padding: widePadding, columns: [[0, 1], [640, 2], [1024, 3]], gap: [[0, 32]], ratio: [[0, 4 / 3]] },
  'blog-page-grid': { padding: widePadding, columns: [[0, 1], [640, 2], [1024, 3]], gap: [[0, 32]] },
  'wedding-grid': { padding: standardPadding, columns: [[0, 1], [768, 2], [1024, 3]], gap: [[0, 32]], ratio: [[0, 4 / 3]] },
  'experience-grid': { padding: standardPadding, columns: [[0, 1], [768, 2], [1024, 3]], gap: [[0, 40]], ratio: [[0, 4 / 3]] },
  'section-banner': { padding: widePadding, columns: [[0, 1]], ratio: [[0, 16 / 7]] },
  'offer-feature': { padding: widePadding, columns: [[0, 1]], height: [[0, 240], [640, 320], [1024, 450]] },
  'gallery-thumb': { padding: standardPadding, columns: [[0, 2], [768, 3]], gap: [[0, 16]], ratio: [[0, 4 / 3]] },
  'villa-thumb': { padding: widePadding, columns: [[0, 2], [768, 3]], gap: [[0, 16]], ratio: [[0, 4 / 3]] },
  'villa-preview': { padding: widePadding, columns: [[0, 1], [768, 3]], gap: [[0, 16]], ratio: [[0, 4 / 3]], tallFrom: 768 },
  'wedding-package': { padding: widePadding, columns: [[0, 1], [768, 2]], gap: [[0, 24]], innerScale: [[0, 1], [768, 1 / 3]] },
  'villa-lightbox': { lightbox: true },
  'gallery-lightbox': { lightbox: true },
};

const valueAt = (rules, viewport, fallback = 0) => rules?.reduce((value, [minimum, next]) => viewport >= minimum ? next : value, fallback) ?? fallback;
const rem = pixels => `${pixels / 16}rem`;

export function getSupportingImageSizes(layout, sourceAspect, sourceWidth) {
  const config = supportingImageLayouts[layout];
  if (!config) throw new Error(`Unknown supporting image layout: ${layout}`);
  if (layout === 'villa-lightbox') return '(min-width: 1056px) 57rem, calc(100vw - 9rem)';
  if (layout === 'gallery-lightbox') return `min(${sourceWidth ? `${sourceWidth}px, ` : ''}72rem, 100vw, calc(80vh * ${sourceAspect}))`;
  const rules = [containers, config.padding, config.columns, config.gap, config.ratio, config.height, config.innerScale];
  const breakpoints = [...new Set(rules.flatMap(list => list?.map(([minimum]) => minimum) ?? []))].sort((a, b) => b - a);
  return breakpoints.map(minimum => {
    const container = valueAt(containers, minimum);
    const columns = valueAt(config.columns, minimum, 1);
    const padding = valueAt(config.padding, minimum);
    const gap = valueAt(config.gap, minimum);
    const innerScale = valueAt(config.innerScale, minimum, 1);
    const width = `((${container ? rem(container) : '100vw'} - ${rem(2 * padding + (columns - 1) * gap)}) / ${columns} * ${innerScale})`;
    const ratio = valueAt(config.ratio, minimum, sourceAspect);
    const height = valueAt(config.height, minimum);
    let effectiveWidth = `calc(${width} * ${Math.max(1, sourceAspect / ratio)})`;
    if (height) effectiveWidth = `max(calc(${width}), ${rem(height * sourceAspect)})`;
    if (config.tallFrom && minimum >= config.tallFrom) effectiveWidth = `max(calc(${width}), calc((${width} * 1.5 + 1rem) * ${sourceAspect}))`;
    return `${minimum ? `(min-width: ${minimum}px) ` : ''}${effectiveWidth}`;
  }).join(', ');
}

export function firstSupportingImage(...images) {
  return images.find(image => image?.asset?.url);
}

export function getSupportingImage(image, { layout, quality = 80, reuseUrls = [] } = {}) {
  if (!supportingImageLayouts[layout]) throw new Error(`Unknown supporting image layout: ${layout}`);
  const src = image?.asset?.url ?? '';
  // A protected hero already downloads this exact original on the same page.
  // Reuse it instead of adding another transfer. Authored crops still use the SDK.
  if (src && reuseUrls.includes(src) && !Object.values(image.crop ?? {}).some(value => typeof value === 'number' && value !== 0)) return { src };
  if (layout === 'home-three' && quality === 80) return getOfferCarouselImage(image);
  const dimensions = image?.asset?.metadata?.dimensions;
  if (!src || !Number.isInteger(dimensions?.width) || !Number.isInteger(dimensions?.height)
    || dimensions.width <= 0 || dimensions.height <= 0) return { src };
  const left = Math.round((image.crop?.left ?? 0) * dimensions.width);
  const top = Math.round((image.crop?.top ?? 0) * dimensions.height);
  const width = Math.round(dimensions.width - (image.crop?.right ?? 0) * dimensions.width - left);
  const height = Math.round(dimensions.height - (image.crop?.bottom ?? 0) * dimensions.height - top);
  if (width <= 0 || height <= 0) return { src };
  const candidates = [...new Set(widths.map(candidate => Math.min(candidate, width)))];
  const urlFor = candidate => builder.image(image).width(candidate).auto('format').quality(quality).fit('max').url();
  return {
    src: urlFor(Math.min(800, width)),
    srcset: candidates.map(candidate => `${urlFor(candidate)} ${candidate}w`).join(', '),
    sizes: getSupportingImageSizes(layout, width / height, width),
  };
}
