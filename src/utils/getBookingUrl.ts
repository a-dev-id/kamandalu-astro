export interface BookableSanityItem {
  bookingLink?: string;
}

export function getBookingUrl(item: BookableSanityItem, fallbackUrl: string): string {
  return item.bookingLink?.trim() || fallbackUrl;
}
