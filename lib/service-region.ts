/**
 * OkayNow launch footprint: Massachusetts only.
 * Keep in sync with backend `app.service-region` / ServiceRegionService.
 * Expand ALLOWED_STATES + ZIP_PREFIXES_BY_STATE when launching elsewhere.
 */

export const ALLOWED_STATES = ["MA"] as const;
export type AllowedState = (typeof ALLOWED_STATES)[number];

export const DEFAULT_STATE: AllowedState = "MA";

/** USPS ZIP3 prefixes for MA (010–027). */
export const MA_ZIP_PREFIXES: readonly string[] = Array.from({ length: 18 }, (_, i) =>
  String(10 + i).padStart(3, "0"),
);

export const ZIP_PREFIXES_BY_STATE: Record<string, readonly string[]> = {
  MA: MA_ZIP_PREFIXES,
};

export const SERVICE_REGION_LABEL = "Massachusetts";

export function isAllowedState(state: string | null | undefined): boolean {
  if (!state) return false;
  return (ALLOWED_STATES as readonly string[]).includes(state.trim().toUpperCase());
}

export function isAllowedZip(state: string, zip: string): boolean {
  const prefixes = ZIP_PREFIXES_BY_STATE[state.trim().toUpperCase()];
  if (!prefixes || prefixes.length === 0) return true;
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 5) return false;
  return prefixes.includes(digits.slice(0, 3));
}

export function maZipMessage(zip: string): string | true {
  if (!zip || zip.replace(/\D/g, "").length < 5) {
    return "Enter a valid 5-digit Massachusetts ZIP";
  }
  if (!isAllowedZip("MA", zip)) {
    return "OkayNow currently accepts Massachusetts ZIP codes only (010–027)";
  }
  return true;
}
