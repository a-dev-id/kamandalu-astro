export function getLocale(langParam) {
  const supported = ["en", "ko", "zh"];
  return supported.includes(langParam) ? langParam : "en";
}
