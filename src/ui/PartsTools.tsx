/**
 * Undo and redo, saved pieces and audio export for the three- and four-voice screens (D155), as
 * the two-voice screen has them (D59, D49, D74-D75): one history per exercise; pieces kept in this
 * browser with their sound settings; what plays recorded live and saved as MP3 or WAV (one setup,
 * one or more passes; the two-voice mix mode is not offered here).
 */
import { useEffect, useRef, useState } from "react";
import { audio, store, stored, validDrumKit } from "./shared.ts";
import { t } from "./i18n.ts";
import { encode, EXPORT_FORMATS, saveFile, type ExportFormat } from "../audio/export.ts";
import { restorePartsPieces, type PartsPiece } from "../game/saved.ts";

type Lines = Record<number, { notes: (string | null)[] }>;
const sameNotes = (a: Lines, b: Lines) => Object.keys(b).every((k) => {
  const x = a[+k]?.notes;
  const y = b[+k].notes;
  return x === y || (!!x && x.length === y.length && x.every((n, i) => n === y[i]));
});

/** Undo/redo: the written parts' history, per exercise (at most 200 steps back). */
export function usePartsHistory<S extends Lines>(stepId: string) {
  const all = useRef(new Map<string, { past: S[]; future: S[] }>());
  const get = () => {
    let h = all.current.get(stepId);
    if (!h) all.current.set(stepId, (h = { past: [], future: [] }));
    return h;
  };
  return {
    /** Call before an edit: remembers `prev` when the notes change. */
    remember(prev: S, next: S) {
      if (sameNotes(prev, next)) return;
      const h = get();
      h.past.push(prev);
      if (h.past.length > 200) h.past.shift();
      h.future = [];
    },
    /** The parts one step back (or forward), or null; `current` goes to the other side. */
    restore(dir: "undo" | "redo", current: S): S | null {
      const h = get();
      const from = dir === "undo" ? h.past : h.future;
      const to = dir === "undo" ? h.future : h.past;
      const s = from.pop();
      if (!s) return null;
      to.push(current);
      return s;
    },
    can: (dir: "undo" | "redo") => (dir === "undo" ? get().past : get().future).length > 0,
  };
}

/** Is this key Ctrl/Cmd+Z (undo) or Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y (redo)? */
export function undoKey(e: KeyboardEvent): "undo" | "redo" | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  return k === "y" ? "redo" : null;
}

/** The pieces saved in three and four voices, and a short notice ("Saved: ..."). */
export function usePartsPieces() {
  const [pieces, setPieces] = useState<PartsPiece[]>(() => restorePartsPieces(stored<unknown>("wtg.savedParts", []), validDrumKit));
  useEffect(() => store("wtg.savedParts", pieces), [pieces]);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  return { pieces, setPieces, toast, setToast };
}

export function Toast({ text }: { text: string | null }) {
  return text ? <div className="toast" role="status">{text}</div> : null;
}

/** The saved pieces of this screen: rename, open (the exercise, the parts, the settings), delete. */
export function SavedParts(p: { pieces: PartsPiece[]; stepName(id: string): string; onOpen(x: PartsPiece): void; onRename(id: string, name: string): void; onDelete(id: string): void; onClose(): void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="dialog-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <section className="dialog saved" role="dialog" aria-modal="true" aria-label={t("ui.saved.title")} onKeyDown={(e) => e.key === "Escape" && p.onClose()}>
        <div className="saved-head">
          <h2>{t("ui.saved.title")}</h2>
          <button ref={close} className="icon quiet" onClick={p.onClose} aria-label={t("ui.saved.close")}>×</button>
        </div>
        {p.pieces.length === 0 && <p className="help">{t("ui.saved.empty")}</p>}
        <ul className="tracks">
          {p.pieces.map((x) => (
            <li key={x.id} className="track">
              <div className="track-body">
                <div className="track-meta">
                  {editing === x.id ? (
                    <input
                      className="track-name-edit"
                      defaultValue={x.name}
                      autoFocus
                      aria-label={t("ui.saved.rename")}
                      onBlur={(e) => {
                        setEditing(null);
                        p.onRename(x.id, e.target.value.trim() || x.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditing(null);
                        e.stopPropagation();
                      }}
                    />
                  ) : (
                    <button className="track-name" onClick={() => setEditing(x.id)} title={t("ui.saved.rename")}>{x.name}</button>
                  )}
                  <span className="track-sub">{p.stepName(x.stepId)} · {x.tempo} ♩/min</span>
                  <time className="track-date" dateTime={x.savedAt}>{new Date(x.savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time>
                </div>
              </div>
              <div className="track-actions">
                <button className="chipbtn" onClick={() => p.onOpen(x)} title={t("ui.saved.openHelp")}>{t("ui.saved.open")}</button>
                <button className="chipbtn" onClick={() => window.confirm(t("ui.saved.deleteConfirm", { name: x.name })) && p.onDelete(x.id)} aria-label={t("ui.saved.delete")} title={t("ui.saved.delete")}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
        <p className="help">{t("ui.saved.helpParts")}</p>
      </section>
    </div>
  );
}

/**
 * Export (as D74-D75, one setup): the screen's own playback recorded from the speakers' feed, for
 * some passes, ending seamlessly or with the final cadence. `start` begins the playback from bar 1;
 * `stop` stops it; `loop` is the screen's loop setting, put back afterwards.
 */
export function usePartsExport(o: { start(): void; stop(): void; playing: boolean; loop: boolean; fileBase: string; onToast(s: string): void }) {
  const [phase, setPhase] = useState<null | "choose" | "recording" | "encoding">(null);
  const [passes, setPasses] = useState(1);
  const [ending, setEnding] = useState<"seamless" | "final">(o.loop ? "seamless" : "final");
  const [pass, setPass] = useState(1);
  const timer = useRef<number | null>(null);
  const stopNow = useRef<null | (() => void)>(null);
  const playing = useRef(o.playing);
  playing.current = o.playing;
  const end = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    stopNow.current = null;
    audio.loop = o.loop;
  };
  useEffect(() => end, []);
  const cancel = async () => {
    end();
    o.stop();
    await audio.stopCapture();
    setPhase(null);
  };
  const begin = async (format: ExportFormat) => {
    o.stop();
    try {
      await audio.startCapture();
    } catch {
      o.onToast(t("ui.export.failed"));
      return setPhase(null);
    }
    const n = passes;
    const how = ending;
    setPass(1);
    setPhase("recording");
    audio.loop = n > 1 || how === "seamless";
    o.start();
    const TAIL = 2.5;
    const finish = (span: [number, number] | null) => {
      end();
      o.stop();
      setPhase("encoding");
      void audio.stopCapture(span?.[0], span?.[1]).then((data) => {
        window.setTimeout(() => {
          if (data && data.channels[0].length > 0) {
            const base = o.fileBase.replace(/[^\p{L}\p{N} -]+/gu, "").trim() || "counterpoint";
            void saveFile(encode(format, data.channels, data.sampleRate), `${base}.${format}`).then((r) => {
              o.onToast(t(`ui.export.${r}`, { format: format.toUpperCase() }));
              setPhase(null);
            });
            return;
          }
          o.onToast(t("ui.export.failed"));
          setPhase(null);
        }, 30);
      });
    };
    stopNow.current = () => {
      const c = audio.captureCycles;
      finish(c.length ? [c[0], audio.now] : null);
    };
    timer.current = window.setInterval(() => {
      const c = audio.captureCycles;
      if (c.length) setPass(Math.min(n, c.filter((x) => x <= audio.now).length || 1));
      if (how === "final" && c.length >= n) audio.loop = false;
      if (c.length > n && audio.now >= c[n] + 0.05) return finish([c[0], c[n]]);
      if (how === "final" && c.length >= n && audio.playEnd !== null && audio.now >= audio.playEnd + TAIL) return finish([c[0], audio.playEnd + TAIL]);
      if (!playing.current && audio.playEnd === null && c.length > 0) stopNow.current?.();
    }, 100);
  };
  const button = () => {
    if (phase === null) {
      setEnding(o.loop ? "seamless" : "final");
      setPhase("choose");
    } else if (phase === "recording") stopNow.current?.();
  };
  const overlay = (
    <>
      {(phase === "choose" || phase === "encoding") && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.export")} onClick={() => phase === "choose" && setPhase(null)}>
          <div className="dialog export-card" onClick={(e) => e.stopPropagation()}>
            <h2>{t("ui.export")}</h2>
            {phase === "choose" && (
              <>
                <p>{t("ui.export.intro")}</p>
                <div className="export-options">
                  <label>{t("ui.export.passes")}</label>
                  <span className="octave">
                    <button className="chipbtn" disabled={passes <= 1} onClick={() => setPasses(passes - 1)} aria-label={t("ui.export.fewer")}>‹</button>
                    <span>{t(passes === 1 ? "ui.export.passOne" : "ui.export.passMany", { n: passes })}</span>
                    <button className="chipbtn" disabled={passes >= 16} onClick={() => setPasses(passes + 1)} aria-label={t("ui.export.more")}>›</button>
                  </span>
                  <label>{t("ui.export.ending")}</label>
                  <span className="segmented">
                    {(["seamless", "final"] as const).map((k) => (
                      <button key={k} className="chipbtn" aria-pressed={ending === k} title={t(`ui.export.ending.${k}.help`)} onClick={() => setEnding(k)}>
                        {t(`ui.export.ending.${k}`)}
                      </button>
                    ))}
                  </span>
                </div>
                <p className="help">{t("ui.export.live")}</p>
                <div className="export-formats">
                  {EXPORT_FORMATS.map((f) => (
                    <button key={f} className={f === "mp3" ? "primary" : undefined} onClick={() => void begin(f)}>
                      <strong>{f.toUpperCase()}</strong> <span className="help">{t(`ui.export.${f}`)}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setPhase(null)}>{t("ui.close")}</button>
              </>
            )}
            {phase === "encoding" && <p>{t("ui.export.encoding")}</p>}
          </div>
        </div>
      )}
      {phase === "recording" && (
        <div className="recording-bar" role="status">
          <span className="rec-dot" aria-hidden="true">●</span>
          <span>{t("ui.export.recordingPass", { n: pass, total: passes })}</span>
          <span className="help">{t("ui.export.mixLive")}</span>
          <button onClick={() => stopNow.current?.()}>{t("ui.export.stopSave")}</button>
          <button onClick={() => void cancel()}>{t("ui.export.cancel")}</button>
        </div>
      )}
    </>
  );
  return { phase, button, overlay };
}
