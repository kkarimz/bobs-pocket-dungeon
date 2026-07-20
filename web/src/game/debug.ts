/** Debug tools — enable with ?debug=true (or ?debug=1) on the URL. */

export function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("debug");
  return v === "true" || v === "1" || v === "yes";
}

export interface DebugFlags {
  freeMove: boolean;
  revealSecrets: boolean;
}

const KEY = "bpd-debug-flags";

export function loadDebugFlags(): DebugFlags {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...defaultFlags(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultFlags();
}

export function saveDebugFlags(flags: DebugFlags): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    /* ignore */
  }
}

function defaultFlags(): DebugFlags {
  return { freeMove: true, revealSecrets: false };
}
