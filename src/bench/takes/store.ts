/**
 * D458, SAVED PERFORMANCES: the takes kept on the device, in its database (IndexedDB: a take with its
 * log is tens of kilobytes, too much for the small store the grades use), the browser asked to keep them
 * (`navigator.storage.persist`, Safari 15.2+; granted most readily to a game on the Home Screen). Safari
 * clears a site's stored data after seven days without a visit unless it runs from the Home Screen, so
 * the library says so once, and every take can be saved as a small file (a backup) and read back.
 *
 * With no database (a private window, an old browser) the takes live for the session only, and the
 * library says so.
 */
import type { Take } from "./take.ts";

const DB = "wtg-takes";
const STORE = "takes";

let opening: Promise<IDBDatabase | null> | null = null;
/** For the session when there is no database. */
const memory = new Map<string, Take>();

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }).createIndex("piece", "piece");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = f(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Whether takes are kept beyond the session (a database answered). */
export async function lasting(): Promise<boolean> {
  return (await open()) !== null;
}

/** The browser asked, once, to keep the takes (true: granted; false: refused or not asked for). */
export async function askToKeep(): Promise<boolean> {
  try {
    const s = navigator.storage;
    if (!s?.persist) return false;
    if (await s.persisted?.()) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

/** A piece's takes, the newest first. */
export async function takesOf(piece: string): Promise<Take[]> {
  const got = await run<Take[]>("readonly", (s) => s.index("piece").getAll(piece));
  const all = got ?? [...memory.values()].filter((t) => t.piece === piece);
  return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** How many takes each piece has (the cards' and the pop-up's count). */
export async function takeCounts(): Promise<Record<string, number>> {
  const keys = await run<IDBValidKey[]>("readonly", (s) => s.index("piece").getAllKeys());
  const out: Record<string, number> = {};
  if (keys === null) {
    for (const t of memory.values()) out[t.piece] = (out[t.piece] ?? 0) + 1;
    return out;
  }
  const all = await run<Take[]>("readonly", (s) => s.getAll());
  for (const t of all ?? []) out[t.piece] = (out[t.piece] ?? 0) + 1;
  return out;
}

/** Kept (or replaced, by its id). True: in the database; false: for the session only. */
export async function putTake(t: Take): Promise<boolean> {
  const ok = await run("readwrite", (s) => s.put(t));
  if (ok === null) memory.set(t.id, t);
  else memory.delete(t.id);
  return ok !== null;
}

export async function deleteTake(id: string): Promise<void> {
  memory.delete(id);
  await run("readwrite", (s) => s.delete(id));
}

/** Renamed (an empty name: back to the take's own). */
export async function renameTake(t: Take, name: string): Promise<Take> {
  const next = { ...t, name: name.trim() || undefined };
  await putTake(next);
  return next;
}

/** D457: the take the fugue's voice uses ("my fugue", phase 2): at most one starred per voice of a piece. */
export async function starTake(t: Take): Promise<Take[]> {
  const same = (await takesOf(t.piece)).filter((x) => x.voice === t.voice);
  const on = !t.star;
  for (const x of same) {
    const want = x.id === t.id ? on : false;
    if (!!x.star !== want) await putTake({ ...x, star: want || undefined });
  }
  return takesOf(t.piece);
}

/** A backup file's contents: the takes, as text (they are small). */
export function backupText(takes: readonly Take[]): string {
  return JSON.stringify({ wtgTakes: 1, takes });
}

/** Takes read back from a backup file (or a single take's); throws a plain message when it is not one. */
export function readBackup(text: string): Take[] {
  const o = JSON.parse(text) as { wtgTakes?: number; takes?: Take[] } | Take;
  const list = "takes" in o && Array.isArray(o.takes) ? o.takes : [o as Take];
  const ok = list.filter((t) => t && t.v === 1 && typeof t.id === "string" && typeof t.piece === "string" && Array.isArray(t.notes) && Array.isArray(t.calls));
  if (!ok.length) throw new Error("not a saved performance");
  return ok;
}
