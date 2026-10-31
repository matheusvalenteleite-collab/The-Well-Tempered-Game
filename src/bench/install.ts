/**
 * D380, play.html on the Home Screen. Whether the game runs installed (its own window: `display-mode`
 * fullscreen or standalone, or iOS's `navigator.standalone`); on iPhone Safari not installed, a gentle
 * hint, once (ADD TO HOME SCREEN: Share ⎙, then Add to Home Screen), never while a piece plays; on
 * Android's Chrome the browser's own install prompt kept (`beforeinstallprompt`) for an INSTALL button
 * in ⚙ SETTINGS. The hint's "seen" is kept on the device (`tb-install-hint-v1`).
 */

export const HINT_KEY = "tb-install-hint-v1";

/** What the decisions read of the browser (navigator and matchMedia), so the tests can give their own. */
export interface Env {
  ua: string;
  maxTouchPoints: number;
  /** iOS's `navigator.standalone` (true only when opened from the Home Screen). */
  standalone?: boolean;
  /** `matchMedia(q).matches`. */
  media: (q: string) => boolean;
}

export function browserEnv(): Env | null {
  if (typeof navigator === "undefined" || typeof window === "undefined") return null;
  return {
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    media: (q) => {
      try {
        return window.matchMedia(q).matches;
      } catch {
        return false;
      }
    },
  };
}

/** Running installed: opened from the Home Screen (iOS) or as an installed app (Android, desktop). */
export function isInstalled(env: Env | null = browserEnv()): boolean {
  if (!env) return false;
  if (env.standalone === true) return true;
  return ["fullscreen", "standalone", "minimal-ui"].some((m) => env.media(`(display-mode: ${m})`));
}

/** An iPhone, iPod or iPad (an iPad on iPadOS says "Macintosh" but has touch points). */
export function isIos(env: Env): boolean {
  return /iPhone|iPad|iPod/.test(env.ua) || (/Macintosh/.test(env.ua) && env.maxTouchPoints > 1);
}

/**
 * Safari itself on iOS, where Add to Home Screen lives in the Share sheet (iOS 16.4+ lets other browsers
 * add too, but each has its own menu: the hint names Safari's steps only). Chrome (CriOS), Firefox
 * (FxiOS), Edge (EdgiOS), Opera (OPiOS) and in-app views (Instagram, Facebook…) excluded.
 */
export function isIosSafari(env: Env): boolean {
  return isIos(env) && /Safari\//.test(env.ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(env.ua);
}

/** The hint to add to the Home Screen: iPhone Safari, not installed, not shown before, and nothing playing. */
export function shouldHint(env: Env | null, seen: boolean, busy: boolean): boolean {
  return !!env && !busy && !seen && isIosSafari(env) && !isInstalled(env);
}

export function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true; // no storage: never nag on every visit
  }
}
export function markHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* this visit only */
  }
}

/** Chrome's install prompt (not in the DOM's types). */
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((f) => f());

/**
 * Listens for Chrome's `beforeinstallprompt` (it fires once, early: call at the page's start) and keeps
 * it for the INSTALL button; `appinstalled` forgets it.
 */
export function watchInstall() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    tell();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    tell();
  });
}
/** Whether the INSTALL button can be offered now. */
export const canInstall = (): boolean => deferred !== null;
/** Called when the prompt comes or goes. Returns the unsubscribe. */
export function onInstallChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
/** INSTALL tapped: the browser's own prompt (once: Chrome gives a prompt one use). */
export async function install(): Promise<boolean> {
  const p = deferred;
  if (!p) return false;
  deferred = null;
  tell();
  try {
    await p.prompt();
    return (await p.userChoice).outcome === "accepted";
  } catch {
    return false;
  }
}
