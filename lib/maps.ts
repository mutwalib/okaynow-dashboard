export interface AddressParts {
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function formatAddress(parts: AddressParts): string {
  return [
    parts.addressLine,
    [parts.city, parts.state].filter(Boolean).join(", "),
    parts.zip,
  ]
    .filter((part) => part && String(part).trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google Maps directions URL — opens navigation / distance from the user's location. */
export function mapsDirectionsUrl(parts: AddressParts): string | null {
  const label = formatAddress(parts);
  if (!label && (parts.lat == null || parts.lng == null)) return null;

  const destination =
    parts.lat != null && parts.lng != null
      ? `${parts.lat},${parts.lng}`
      : label;

  const url = new URL("https://www.google.com/maps/dir/?api=1");
  url.searchParams.set("destination", destination);
  return url.toString();
}
