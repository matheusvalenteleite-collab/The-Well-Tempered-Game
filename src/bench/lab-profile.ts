/**
 * D440, D441: a Lab page played as a new player meets the game (the Glenn pilot): every key the page
 * stores in localStorage kept under PROFILE (the Storage methods wrapped once, before the first render),
 * so the device's play.html progress is neither read nor written. `resetProfile` wipes the profile alone.
 */
export const PROFILE = "tb-prog:";

let raw: { get: Storage["getItem"]; set: Storage["setItem"]; del: Storage["removeItem"]; key: Storage["key"] } | null = null;
export function installProfile(): void {
  if (raw || typeof Storage === "undefined") return;
  const P = Storage.prototype;
  raw = { get: P.getItem, set: P.setItem, del: P.removeItem, key: P.key };
  const r = raw;
  const k = (key: string) => (key.startsWith(PROFILE) ? key : PROFILE + key);
  P.getItem = function (key: string) {
    return r.get.call(this, k(key));
  };
  P.setItem = function (key: string, v: string) {
    return r.set.call(this, k(key), v);
  };
  P.removeItem = function (key: string) {
    return r.del.call(this, k(key));
  };
}
export function resetProfile(): void {
  if (!raw) return;
  const s = localStorage;
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = raw.key.call(s, i);
    if (key?.startsWith(PROFILE)) keys.push(key);
  }
  for (const key of keys) raw.del.call(s, key);
}
