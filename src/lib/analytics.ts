/**
 * Analytics facade for AyaMir.
 * Keep this dependency-free: Chrome MV3 rejects bundled code that can load
 * remotely hosted executable scripts.
 */
const OPT_OUT_KEY = "mirana_analytics_opt_out";

let initialized = false;

async function loadOptOut(): Promise<boolean> {
  try {
    const r = await chrome.storage.local.get(OPT_OUT_KEY);
    return r[OPT_OUT_KEY] === true;
  } catch {
    return false;
  }
}

/** Initialize analytics. Safe to call multiple times. */
export async function initAnalytics(extensionName: string): Promise<void> {
  void extensionName;
  if (initialized) return;
  initialized = true;
}

/** Track a custom event. Disabled in this local-first build. */
export function track(event: string, props?: Record<string, unknown>): void {
  void event;
  void props;
}

/** Identify a user. Disabled in this local-first build. */
export function identify(
  userId: string,
  props?: Record<string, unknown>,
): void {
  void userId;
  void props;
}

/** Set opt-out state. Kept for compatibility with existing stored settings. */
export async function setOptOut(value: boolean): Promise<void> {
  initialized = true;
  await chrome.storage.local.set({ [OPT_OUT_KEY]: value });
}

/** Current opt-out state. */
export async function isOptedOut(): Promise<boolean> {
  return await loadOptOut();
}
