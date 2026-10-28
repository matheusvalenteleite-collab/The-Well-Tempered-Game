/**
 * D343: play.html for the owner's friends is kept to Book I's fugues and the tutorial; everything else
 * (BOOK II, MORE BACH, CHORALES, TOOLS, the advanced settings, and on a computer the game itself with
 * ⚙ PLAY ON) comes back behind a secret: in ⚙ SETTINGS (or on the MOBILE ONLY screen) the version
 * label tapped seven times within three seconds opens a passphrase field; the right passphrase sets
 * `tb-unlock-all` on the device and reloads. Only the passphrase's SHA-256 is kept here (of the trimmed,
 * lower-cased input): the passphrase itself is never written in the code, its comments, tests or docs.
 */
export const UNLOCK_KEY = "tb-unlock-all";
export const UNLOCK_HASH = "fb6c3730b0c638153a307e0ca6c18f0df952bf240e05e0469ba5e7a892d72546";
/**
 * D369: a second passphrase, typed in the same secret field, locks the device again (clears
 * `tb-unlock-all` and reloads), so the owner sees what a new player sees. Only its hash is kept; it is
 * accepted whether the device is locked or unlocked. Nothing else (the first-run state) is reset.
 */
export const LOCK_HASH = "651c608289ef7de7702d00edf30b4218d662f6a643362b22021632b846fb801e";
/** What a phrase typed in the secret field does: unlock, lock again, or nothing. */
export async function secretAction(input: string): Promise<"unlock" | "lock" | null> {
  if (await passMatches(input, UNLOCK_HASH)) return "unlock";
  if (await passMatches(input, LOCK_HASH)) return "lock";
  return null;
}
/** Taps on the version label, and the time they must fall within. */
export const UNLOCK_TAPS = 7;
export const UNLOCK_WINDOW_MS = 3000;

/** D376: everything open for this page only (THE EXPRESSION LAB), nothing written to the device. */
let forced = false;
export function forceUnlocked(on = true) {
  forced = on;
}
/** Everything unlocked on this device (read in try/catch: no storage, nothing unlocked). */
export function unlocked(): boolean {
  if (forced) return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}
export function setUnlocked(on: boolean) {
  try {
    if (on) localStorage.setItem(UNLOCK_KEY, "1");
    else localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* no storage: nothing to keep */
  }
}

/** SHA-256 of a text, in lower-case hex (Web Crypto: the browser's, and Node's globalThis.crypto in the tests). */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Whether an input is the passphrase whose hash is `hash` (trimmed, lower-cased first). Never throws. */
export async function passMatches(input: string, hash: string = UNLOCK_HASH): Promise<boolean> {
  try {
    return (await sha256Hex(input.trim().toLowerCase())) === hash;
  } catch {
    return false;
  }
}

/**
 * Counts taps: true on the `n`th tap within `ms` of the first counted one (then starts again). Taps
 * older than the window drop out, so seven slow taps never open it.
 */
export function tapCounter(n: number = UNLOCK_TAPS, ms: number = UNLOCK_WINDOW_MS): (now: number) => boolean {
  let taps: number[] = [];
  return (now: number) => {
    taps = [...taps.filter((t) => now - t < ms), now];
    if (taps.length < n) return false;
    taps = [];
    return true;
  };
}
