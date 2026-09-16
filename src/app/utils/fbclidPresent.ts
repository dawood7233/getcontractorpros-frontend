/**
 * Capture Meta fbclid from landing URL (observe-only).
 * Call once on first land BEFORE cleaning query params.
 * Only expose fbclid_present (0|1) to the lead payload — never the raw id.
 */

let fbclidPresent = 0;
let captured = false;

export function captureFbclidFromUrl(): number {
  try {
    if (typeof window === "undefined") return fbclidPresent;
    // Do not overwrite a prior successful capture (e.g. after URL was cleaned).
    if (captured) return fbclidPresent;
    const v = new URLSearchParams(window.location.search).get("fbclid");
    fbclidPresent = v && String(v).trim() ? 1 : 0;
    captured = true;
  } catch {
    if (!captured) {
      fbclidPresent = 0;
      captured = true;
    }
  }
  return fbclidPresent;
}

/** Returns 0|1. If never captured, tries URL once (safe if params already stripped → 0). */
export function getFbclidPresent(): number {
  if (!captured && typeof window !== "undefined") {
    captureFbclidFromUrl();
  }
  return fbclidPresent ? 1 : 0;
}
