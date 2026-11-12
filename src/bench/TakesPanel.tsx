/**
 * D458, SAVED PERFORMANCES: a fugue's takes (the player's voice as played, D457), the newest first, each
 * named as the owner asked ("ALTO · A · 17:30 23/05/2026", or the name given): LISTEN plays it back with
 * the game's other voices; RENAME; DELETE (asked twice). Below: SAVE A BACKUP (every take of the fugue in a
 * small file) and OPEN A BACKUP, and, where the device may clear them, why and what to do.
 */
import { useEffect, useRef, useState } from "react";
import { partName, tr } from "../i18n/index.ts";
import { fugueById } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { presetById } from "../touch/sound.ts";
import { takeName, type Take } from "./takes/take.ts";
import { backupText, deleteTake, lasting, putTake, readBackup, renameTake, takesOf } from "./takes/store.ts";

/** A take's voice word, as the pop-up names the voices (ALTO; UPPER for a two-part piece). */
export function takeVoiceWord(piece: string): (voice: number) => string {
  const f = fugueById(piece);
  return (v) => partName(f.kind, f.voiceNames[v] ?? f.voiceNames[0] ?? "");
}

/** Whether the game runs from the Home Screen (where Safari keeps its data). */
export function onHomeScreen(): boolean {
  try {
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** A file handed to the player to keep (a download). */
export function saveFile(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function TakesPanel({ piece, listen, close }: { piece: string; listen: (t: Take) => void; close: () => void }) {
  const f = fugueById(piece);
  const word = takeVoiceWord(piece);
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [kept, setKept] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const reload = () => void takesOf(piece).then(setTakes);
  useEffect(() => {
    reload();
    void lasting().then(setKept);
  }, [piece]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), close());
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [close]);
  const restore = async (fl: File) => {
    try {
      const got = readBackup(await fl.text()).filter((t) => t.piece === piece);
      for (const t of got) await putTake(t);
      setSaid(tr("{n} PERFORMANCES READ", { n: got.length }));
      reload();
    } catch {
      setSaid(tr("THAT FILE IS NOT A SAVED PERFORMANCE"));
    }
  };
  return (
    <div className="tb-pop-veil tb-takes-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tb-pop tb-takes" role="dialog" aria-modal="true" aria-label={tr("SAVED PERFORMANCES")}>
        <button type="button" id="takes-close" className="tg-x tb-pop-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-pop-title">{tr("SAVED PERFORMANCES")}</h2>
        {takes && takes.length === 0 && <p className="tb-takes-none">{tr("NO SAVED PERFORMANCES YET. FINISH A RUN AND TAP SAVE ON THE SCORE CARD.")}</p>}
        <ul className="tb-takes-list">
          {takes?.map((t) => (
            <li key={t.id} className="tb-take" id={`take-${t.id}`}>
              <span className="tb-take-dot" style={{ background: inkOf(t.voice, f.voices.length) }} aria-hidden="true" />
              <div className="tb-take-what">
                {renaming === t.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value;
                      void renameTake(t, v).then(() => (setRenaming(null), reload()));
                    }}
                  >
                    <input name="name" className="tb-take-name-in" defaultValue={takeName(t, word)} maxLength={60} autoFocus aria-label={tr("NAME")} />
                    <button type="submit" className="tb-take-btn">
                      {tr("DONE")}
                    </button>
                  </form>
                ) : (
                  <p className="tb-take-name">{takeName(t, word)}</p>
                )}
                <p className="tb-take-meta">
                  {presetById(t.sound).name} · ♩ {Math.round(t.bpm)}
                  {t.failedBar !== null ? ` · ${tr("THE CROWD LEFT AT BAR {n}", { n: t.failedBar })}` : ""}
                </p>
                <div className="tb-take-acts">
                  <button type="button" className="tb-take-btn tb-take-listen" id={`take-listen-${t.id}`} onClick={() => listen(t)}>
                    ▶ {tr("LISTEN")}
                  </button>
                  <button type="button" className="tb-take-btn" onClick={() => setRenaming(renaming === t.id ? null : t.id)}>
                    {tr("RENAME")}
                  </button>
                  {asking === t.id ? (
                    <>
                      <button type="button" className="tb-take-btn tb-take-del" id={`take-delete-yes-${t.id}`} onClick={() => void deleteTake(t.id).then(() => (setAsking(null), reload()))}>
                        {tr("YES, DELETE")}
                      </button>
                      <button type="button" className="tb-take-btn" onClick={() => setAsking(null)}>
                        {tr("KEEP")}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="tb-take-btn" id={`take-delete-${t.id}`} onClick={() => setAsking(t.id)}>
                      {tr("DELETE")}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="tb-take-acts tb-takes-files">
          {takes && takes.length > 0 && (
            <button type="button" className="tb-take-btn" id="takes-backup" onClick={() => saveFile(`${piece}-performances.json`, backupText(takes))}>
              {tr("SAVE A BACKUP")}
            </button>
          )}
          <button type="button" className="tb-take-btn" id="takes-restore" onClick={() => file.current?.click()}>
            {tr("OPEN A BACKUP")}
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.currentTarget.files?.[0] && void restore(e.currentTarget.files[0])} />
        </div>
        {said && (
          <p className="tb-takes-note" role="status">
            {said}
          </p>
        )}
        {!kept ? (
          <p className="tb-takes-note" id="takes-session">
            {tr("THIS BROWSER KEEPS THEM ONLY UNTIL YOU LEAVE THE PAGE. SAVE A BACKUP TO KEEP THEM.")}
          </p>
        ) : (
          !onHomeScreen() && (
            <p className="tb-takes-note" id="takes-home">
              {tr("ON AN IPHONE, ADD THE GAME TO YOUR HOME SCREEN TO KEEP THEM: SAFARI CLEARS A SITE'S RECORDINGS AFTER SEVEN DAYS WITHOUT A VISIT.")}
            </p>
          )
        )}
      </div>
    </div>
  );
}
