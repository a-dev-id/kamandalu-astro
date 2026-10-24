import { createImageUrlBuilder } from '@sanity/image-url';
import client from '../lib/sanityClient.js';

// Homepage offer cards only. Never use this policy for headers or hero fallbacks.
const builder = createImageUrlBuilder(client);
const widths = [320, 480, 640, 800, 960, 1280, 1536, 1760];

// Matches the existing Tailwind container/padding and Splide perPage/gap settings.
// The 768px and 1024px cases are single-pixel overlaps between their breakpoints.
function sizesForAspectRatio(aspectRatio) {
  // object-cover magnifies a wide source to fill the taller existing card.
  // Account for that magnification rather than undersizing the visible pixels.
  const desktopScale = Math.max(1, aspectRatio / (3 / 2));
  const mobileScale = Math.max(1, aspectRatio / (4 / 3));
  return [
    `(min-width: 1536px) calc((96rem - 8rem) / 3 * ${desktopScale})`,
    `(min-width: 1367px) calc((80rem - 13rem) / 3 * ${desktopScale})`,
    `(min-width: 1280px) calc((80rem - 9rem) / 3 * ${desktopScale})`,
    `(min-width: 1025px) calc((64rem - 6rem) / 3 * ${desktopScale})`,
    `(min-width: 1024px) calc(30rem * ${desktopScale})`,
    `(min-width: 769px) calc(22rem * ${desktopScale})`,
    `(min-width: 768px) calc(46rem * ${desktopScale})`,
    `(min-width: 640px) calc(38rem * ${mobileScale})`,
    `calc((100vw - 2rem) * ${mobileScale})`,
  ].join(', ');
}

export function getOfferCarouselImage(image) {
  const src = image?.asset?.url ?? '';
  const sourceWidth = image?.asset?.metadata?.dimensions?.width;
  const sourceHeight = image?.asset?.metadata?.dimensions?.height;

  // Unknown dimensions cannot support truthful width descriptors. Keep the URL.
  if (!src || !Number.isInteger(sourceWidth) || sourceWidth <= 0
    || !Number.isInteger(sourceHeight) || sourceHeight <= 0) return { src };

  // Match the builder's integer crop rectangle, including its left-edge rounding.
  const left = Math.round((image.crop?.left ?? 0) * sourceWidth);
  const availableWidth = Math.round(sourceWidth - (image.crop?.right ?? 0) * sourceWidth - left);
  const top = Math.round((image.crop?.top ?? 0) * sourceHeight);
  const availableHeight = Math.round(sourceHeight - (image.crop?.bottom ?? 0) * sourceHeight - top);
  if (availableWidth <= 0 || availableHeight <= 0) return { src };

  const candidates = [...new Set(widths.map(width => Math.min(width, availableWidth)))];
  const urlForWidth = width => builder.image(image)
    .width(width)
    .auto('format')
    .quality(80)
    .fit('max')
    .url();

  // Width-only resizing retains the authored crop's proportions. No new target
  // aspect ratio or focal-point override is introduced; the full hotspot stays
  // on the image object, and the card's existing CSS alignment stays unchanged.
  return {
    src: urlForWidth(Math.min(640, availableWidth)),
    srcset: candidates.map(width => `${urlForWidth(width)} ${width}w`).join(', '),
    sizes: sizesForAspectRatio(availableWidth / availableHeight),
  };
}
