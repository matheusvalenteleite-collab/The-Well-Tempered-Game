/**
 * D498, THE SOUND LAB's notes: kept per fugue on the device (its own keys, never the game's), and sent to Claude as a
 * GitHub issue in the game's repository (no backend on GitHub Pages: the new-issue page, pre-filled, which the owner
 * submits), or copied.
 */
export const REPO = "matheusvalenteleite-collab/The-Well-Tempered-Game";
export const NOTES_KEY = (piece: string) => `tb-soundlab-notes:${piece}`;
/** The longest note put in an address (GitHub's new-issue page takes about 8 KB of address). */
export const MAX_NOTE = 5000;

export function loadNote(piece: string): string {
  try {
    return localStorage.getItem(NOTES_KEY(piece)) ?? "";
  } catch {
    return "";
  }
}
export function saveNote(piece: string, text: string): void {
  try {
    if (text) localStorage.setItem(NOTES_KEY(piece), text);
    else localStorage.removeItem(NOTES_KEY(piece));
  } catch {
    /* this visit only */
  }
}

/** The note as sent: the text, the settings in words, the link to the moment. */
export function noteBody(note: string, settings: string, link: string): string {
  const text = note.length > MAX_NOTE ? `${note.slice(0, MAX_NOTE)}\n\n[note cut at ${MAX_NOTE} characters]` : note;
  return `${text}\n\n---\nSettings: ${settings}\nMoment: ${link}\n\n(Sent from the Sound Lab.)`;
}
/** The new-issue page, pre-filled. */
export function issueUrl(fugue: string, body: string): string {
  const q = new URLSearchParams({ title: `Sound Lab notes: ${fugue}`, body });
  return `https://github.com/${REPO}/issues/new?${q.toString()}`;
}
