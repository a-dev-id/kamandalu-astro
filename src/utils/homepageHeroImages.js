// Local visual test only. Set false and rebuild to restore original JPG delivery.
export const HOMEPAGE_HERO_WEBP_TEST = true;

// Highest tested integer quality whose payload is below the original JPG.
// New/unmeasured assets retain their originals until their size is verified.
export const homepageHeroWebpQualities = {
  '0396747df20f3b51e91c200a7c8deaf204a3f421-1920x1080.jpg': 81,
  'c54ca7d9b4fce17cc4f5b6703e07df70d40f8e77-1920x1080.jpg': 82,
  '83344bd07865c8c9443339e6bf6014e29f140fb7-1920x1080.jpg': 84,
  '9a869f427ef1412b048323061859f8b121aa4235-1920x1080.jpg': 84,
  'a055687869c2518bb9c7f378e67c3e399265c19a-1920x1080.jpg': 82,
  '41b98180e6d7fbf067c999e9c8f2938132071d3c-1920x1080.jpg': 78,
  'c0e829a05fd45767cd6fe3cacbf4918694e2afa1-1920x1080.jpg': 84,
  '1d7d0211061006a0ff8e9c9c0ad1b6713e73a387-1920x1080.jpg': 82,
};
const sharedOriginal = '0396747df20f3b51e91c200a7c8deaf204a3f421-1920x1080.jpg';

export function getHomepageHeroImageUrl(src, { enabled = HOMEPAGE_HERO_WEBP_TEST } = {}) {
  if (!enabled || !src) return src ?? '';
  try {
    const url = new URL(src);
    if (url.hostname !== 'cdn.sanity.io' || !url.pathname.startsWith('/images/') || !/\.jpe?g$/i.test(url.pathname)) return src;
    const asset = url.pathname.split('/').at(-1);
    const quality = homepageHeroWebpQualities[asset];
    // The aerial JPG is also needed by an unchanged supporting card. Keep its
    // hero URL identical so the browser downloads and caches that source once.
    if (!quality || url.search || asset === sharedOriginal) return src;
    // Keep the original asset dimensions and existing crop behavior. Passing the
    // complete Sanity image object to a builder could apply previously ignored
    // authored crops/hotspots, so this test changes only format and quality.
    url.searchParams.set('fm', 'webp');
    url.searchParams.set('q', String(quality));
    return url.href;
  } catch {
    return src;
  }
}
