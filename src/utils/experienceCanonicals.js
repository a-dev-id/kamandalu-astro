// Keep each experience's canonical destination within its own language.
const experienceCanonicals = new Map(
  ['en', 'ko', 'zh'].flatMap(locale => {
    const forestSwingCanonical = `https://kamandaluresort.com/${locale}/spa-wellness/forest-swing-at-forest-spa-ubud/`;
    const flowerPoolCanonical = `https://kamandaluresort.com/${locale}/ubud-experiences-and-activities/signature-experiences/flower-pool-ubud/`;

    return [
      [new URL(forestSwingCanonical).pathname, forestSwingCanonical],
      [`/${locale}/ubud-experiences-and-activities/signature-experiences/forest-swing-at-forest-spa-ubud/`, forestSwingCanonical],
      [new URL(flowerPoolCanonical).pathname, flowerPoolCanonical],
      [`/${locale}/spa-wellness/flower-pool/`, flowerPoolCanonical],
    ];
  })
);

export function getExperienceCanonicalUrl(url) {
  if (!url) return url;

  const pathname = new URL(url, 'https://kamandaluresort.com').pathname.replace(/\/?$/, '/');
  return experienceCanonicals.get(pathname) ?? url;
}
