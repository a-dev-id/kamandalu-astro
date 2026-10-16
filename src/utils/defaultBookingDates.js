export function withDefaultBookingDates(href, today = new Date()) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return href;
  }

  if (!['www.book-secure.com', 'book-secure.com'].includes(url.hostname)) {
    return href;
  }

  const departure = new Date(today);
  departure.setDate(departure.getDate() + 2);

  const formatDate = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  url.searchParams.set('arrival', formatDate(today));
  url.searchParams.set('departure', formatDate(departure));
  return url.toString();
}
