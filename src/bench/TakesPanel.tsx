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
import { backupText, deleteTake, lasting, putTake, readBackup, renameTake, starTake, takesOf } from "./takes/store.ts";
import { clampLevel, LEVEL_STEP, readMix, saveMix, starred, type MixVoice } from "./takes/myfugue.ts";

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

/** D720: a take handed to a friend: the phone's share sheet with the file where it can, else a download. */
export async function sendTake(t: Take, name: string): Promise<"shared" | "saved" | "cancelled"> {
  const text = backupText([t]);
  const fileName = `${name.replace(/[^A-Za-z0-9À-ÿ]+/g, "-").replace(/^-|-$/g, "") || "performance"}.json`;
  try {
    const file = new File([text], fileName, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return "shared";
    }
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return "cancelled";
  }
  saveFile(fileName, text);
  return "saved";
}

export interface MyFugueActs {
  /** The voices the piece lets the player play (the pop-up's). */
  singing: readonly number[];
  /** The set's sound and tempo (the piece's own, chosen on the selection). */
  sound: string;
  tempo?: string;
  /** LISTEN TO MY FUGUE: the starred takes together (the rest by the game). */
  listenAll: (set: Map<number, Take>) => void;
  /** RECORD a voice over the starred takes. */
  record: (voice: number, set: Map<number, Take>) => void;
}

export function TakesPanel({ piece, listen, close, my }: { piece: string; listen: (t: Take) => void; close: () => void; my?: MyFugueActs }) {
  const f = fugueById(piece);
  const word = takeVoiceWord(piece);
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [kept, setKept] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [mix, setMixState] = useState<MixVoice[]>(() => readMix(piece, f.voices.length));
  const setMix = (i: number, ch: Partial<MixVoice>) => {
    const next = mix.map((v, k) => (k === i ? { ...v, ...ch, level: clampLevel(ch.level ?? v.level) } : v));
    setMixState(next);
    saveMix(piece, next);
  };
  const set = starred(takes ?? []);
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
      setSaid(got.length ? tr("{n} PERFORMANCES READ", { n: got.length }) : tr("THAT FILE IS FOR ANOTHER PIECE"));
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
        <h2 className="tb-pop-title">{my ? tr("MY FUGUE") : tr("SAVED PERFORMANCES")}</h2>
        {my && (
          // D720: MY FUGUE's mixer: a row a voice (its take or the game's), MUTE, SOLO, the level, RECORD.
          <div className="tb-mix" id="my-mix" role="group" aria-label={tr("MY FUGUE")}>
            <button type="button" className="tb-take-btn tb-take-save-btn tb-mix-listen" id="my-listen" disabled={set.size === 0} onClick={() => my.listenAll(set)}>
              ▶ {tr("LISTEN TO MY FUGUE")}
            </button>
            <p className="tb-takes-note" id="my-sound">
              {tr("EVERY VOICE ON {sound}", { sound: presetById(my.sound).name })}
              {my.tempo ? ` · ${tr("TEMPO")} ${my.tempo}` : ""} · {tr("CHANGE THEM ON THE SELECTION.")}
            </p>
            {f.voiceNames.map((_, v) => {
              const tk = set.get(v);
              const m = mix[v];
              return (
                <div key={v} className="tb-mix-row" id={`mix-${v}`}>
                  <span className="tb-take-dot" style={{ background: inkOf(v, f.voices.length) }} aria-hidden="true" />
                  <div className="tb-mix-who">
                    <p className="tb-mix-voice">{word(v)}</p>
                    <p className="tb-take-meta">{tk ? `${tr("YOU")} · ${takeName(tk, word)}` : tr("PLAYED BY THE GAME")}</p>
                  </div>
                  <div className="tb-mix-ctl">
                    <button type="button" className={`tb-take-btn tb-mix-m${m.mute ? " on" : ""}`} id={`mix-mute-${v}`} aria-pressed={m.mute} aria-label={`${tr("MUTE")} ${word(v)}`} onClick={() => setMix(v, { mute: !m.mute })}>
                      M
                    </button>
                    <button type="button" className={`tb-take-btn tb-mix-s${m.solo ? " on" : ""}`} id={`mix-solo-${v}`} aria-pressed={m.solo} aria-label={`${tr("SOLO")} ${word(v)}`} onClick={() => setMix(v, { solo: !m.solo })}>
                      S
                    </button>
                    <button type="button" className="tb-take-btn tb-mix-step" aria-label={`${tr("SOFTER")} ${word(v)}`} disabled={m.level <= 0} onClick={() => setMix(v, { level: m.level - LEVEL_STEP })}>
                      −
                    </button>
                    <span className="tb-mix-level" id={`mix-level-${v}`} aria-live="polite">
                      {Math.round(m.level * 100)}%
                    </span>
                    <button type="button" className="tb-take-btn tb-mix-step" aria-label={`${tr("LOUDER")} ${word(v)}`} disabled={m.level >= 1.5} onClick={() => setMix(v, { level: m.level + LEVEL_STEP })}>
                      +
                    </button>
                    {my.singing.includes(v) && (
                      <button type="button" className="tb-take-btn tb-mix-rec" id={`mix-record-${v}`} onClick={() => my.record(v, set)}>
                        ● {tr("RECORD")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {set.size === 0 && <p className="tb-takes-note">{tr("STAR A TAKE BELOW TO USE IT IN MY FUGUE, OR RECORD A VOICE.")}</p>}
          </div>
        )}
        {my && <h3 className="tb-pop-ask tb-takes-head">{tr("SAVED PERFORMANCES")}</h3>}
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
                  {my && (
                    // D720: the take the voice uses in MY FUGUE (one a voice).
                    <button type="button" className={`tb-take-btn tb-take-star${t.star ? " on" : ""}`} id={`take-star-${t.id}`} aria-pressed={!!t.star} onClick={() => void starTake(t).then(setTakes)}>
                      {t.star ? `★ ${tr("IN MY FUGUE")}` : `☆ ${tr("USE IN MY FUGUE")}`}
                    </button>
                  )}
                  <button type="button" className="tb-take-btn tb-take-listen" id={`take-listen-${t.id}`} onClick={() => listen(t)}>
                    ▶ {tr("LISTEN")}
                  </button>
                  <button type="button" className="tb-take-btn" id={`take-send-${t.id}`} onClick={() => void sendTake(t, takeName(t, word)).then((r) => r !== "cancelled" && setSaid(r === "shared" ? tr("SENT") : tr("SAVED AS A FILE: SEND IT TO A FRIEND, WHO OPENS IT WITH OPEN A FILE")))}>
                    {tr("SEND")}
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
            {tr("OPEN A FILE")}
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
