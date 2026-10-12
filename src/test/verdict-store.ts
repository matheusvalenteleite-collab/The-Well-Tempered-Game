/**
 * P36: the blind tests' verdicts kept where the playback session can read them (the artifact's
 * database, `verdicts/<test id>`), saved as they are written, not only at Reveal. The owner lost
 * a session of annotations kept only in the page; the browser's copy stays as a second record.
 * Outside claude.ai (the local test page) there is no database and only the browser keeps them.
 */
type Doc = { set(data: Record<string, unknown>): Promise<void> };
type Db = { doc(path: string): Doc };
type ClaudeUse = { use(name: string): Promise<unknown> };

let db: Promise<Db | null> | null = null;
function database(): Promise<Db | null> {
  const c = (window as unknown as { claude?: ClaudeUse }).claude;
  if (!c?.use) return Promise.resolve(null); // not (yet) on claude.ai: asked again at the next save
  db ??= c.use("db").then((x) => (x as Db | null) ?? null, () => null);
  return db;
}

/** Save one blind test's state; resolves whether the database took it. */
export async function saveVerdict(id: string, data: Record<string, unknown>): Promise<boolean> {
  const d = await database();
  if (!d) return false;
  try {
    await d.doc(`verdicts/${id}`).set(data);
    return true;
  } catch {
    return false;
  }
}
