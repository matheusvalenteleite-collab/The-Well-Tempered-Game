/**
 * D333 (WTC 1.49), THE LAB's STUDY tab: the progress study (study.ts, study-excerpts.ts). START STUDY;
 * before each excerpt a short screen (which, what it tests) with ▶ and HEAR IT FIRST (once, optional,
 * not counted); then its ten takes in a row, each with the normal count-in, the next starting by itself
 * after a 2 s pause showing the take's tally; PAUSE at any moment (a take interrupted is discarded and
 * played again); everything saved on the device after every take, resumable days later; SAVE FILE (the
 * whole study as one JSON file, shared or downloaded) and COPY at any time.
 *
 * The lab (LabApp.tsx) is the host: it applies the study's settings in memory (never over the owner's
 * stored ones, put back when the session ends), plays a take through its own run (the RUNS log), and
 * tells the study when a run ends (`ended`).
 */
import { useEffect, useRef, useState } from "react";
import type { Mech } from "../mechanics.ts";
import { fugueById } from "../../touch/fugue.ts";
import type { LabLog } from "./log.ts";
import {
  addTake,
  BETWEEN_MS,
  clearStudy,
  excerptSeconds,
  loadStudy,
  mark,
  newStudy,
  saveHead,
  saveTake,
  studyDone,
  studyFileName,
  studyText,
  STUDY_PRESET,
  type StudyFile,
  type StudyItem,
} from "./study.ts";
import { configById } from "./presets.ts";
import { pieceShort } from "./study-excerpts.ts";
import { takeStats, type TakeStats } from "./study-report.ts";

export interface StudyHost {
  /** The sound unlocked in the tap (iOS). */
  unlock(): void;
  /** The study's settings put in place (in memory) and the excerpt played: a take, or (listen) the game playing it. */
  play(it: StudyItem, mech: Mech, presetId: string, listen: boolean): void;
  /** What plays stopped, discarded. */
  halt(): void;
  /** The owner's own settings back. */
  restore(): void;
  /** The panel opened at STUDY (or closed). */
  show(open: boolean): void;
}

export type StudyPhase = "none" | "intro" | "listen" | "take" | "between" | "paused" | "done";

export interface Study {
  s: StudyFile | null;
  phase: StudyPhase;
  /** Playing or between takes: the HUD shows the progress and PAUSE. */
  active: boolean;
  /** "Excerpt 3/10 · take 4/10". */
  progress: string;
  last: TakeStats | null;
  note: string;
  start(): void;
  play(): void;
  listen(): void;
  pause(): void;
  resume(): void;
  leave(): void;
  ended(log: LabLog, listen: boolean): void;
  saveFile(): void;
  copy(): void;
}

const ACTIVE: StudyPhase[] = ["listen", "take", "between"];

export function useStudy(host: StudyHost, app: string, bpmOf: (piece: string) => number): Study {
  const [s, setS] = useState<StudyFile | null>(null);
  const [phase, setPhaseRaw] = useState<StudyPhase>("none");
  const [last, setLast] = useState<TakeStats | null>(null);
  const [note, setNote] = useState("");
  const sRef = useRef(s);
  const phaseRef = useRef(phase);
  const hostRef = useRef(host);
  hostRef.current = host;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const put = (x: StudyFile | null) => {
    sRef.current = x;
    setS(x);
    if (x) saveHead(x);
  };
  const setPhase = (p: StudyPhase) => {
    phaseRef.current = p;
    setPhaseRaw(p);
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // The study saved on this device, read back once (its takes unpacked).
  useEffect(() => {
    let live = true;
    void loadStudy().then((x) => {
      if (!live || !x || sRef.current) return;
      sRef.current = x;
      setS(x);
      setPhase(studyDone(x) ? "done" : x.pos.take === 0 ? "intro" : "paused");
    });
    return () => {
      live = false;
      clear();
    };
  }, []);

  const item = (x: StudyFile) => x.excerpts[x.pos.excerpt];
  const go = (listen: boolean) => {
    const x = sRef.current;
    if (!x || studyDone(x)) return;
    hostRef.current.unlock();
    setPhase(listen ? "listen" : "take");
    hostRef.current.play(item(x), x.mech, x.preset.id, listen);
  };
  const pause = () => {
    const p = phaseRef.current;
    if (!ACTIVE.includes(p)) return;
    clear();
    hostRef.current.halt();
    const x = sRef.current;
    if (x) put(mark(p === "take" ? mark(x, "discard") : x, "pause"));
    setPhase(p === "listen" ? "intro" : "paused");
    hostRef.current.show(true);
  };
  // The phone locked or the page hidden mid-take: paused (the take played again).
  useEffect(() => {
    const vis = () => document.visibilityState === "hidden" && pause();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const next = () => {
    timer.current = null;
    const x = sRef.current;
    if (!x || phaseRef.current !== "between") return;
    if (studyDone(x)) {
      setPhase("done");
      hostRef.current.restore();
      hostRef.current.show(true);
    } else if (x.pos.take === 0) {
      setPhase("intro");
      hostRef.current.show(true);
    } else go(false);
  };

  const ended = (log: LabLog, listen: boolean) => {
    const x = sRef.current;
    if (!x) return;
    if (listen) {
      if (phaseRef.current !== "listen") return;
      put(mark({ ...x, excerpts: x.excerpts.map((it, i) => (i === x.pos.excerpt ? { ...it, heard: it.heard + 1 } : it)) }, "listen"));
      setPhase("intro");
      hostRef.current.show(true);
      return;
    }
    if (phaseRef.current !== "take") return;
    const { excerpt, take } = x.pos;
    const y = addTake(x, log, app);
    put(y);
    setLast(takeStats(log, take + 1));
    setPhase("between");
    void saveTake(y, excerpt, take).then((ok) => {
      if (!ok) setNote(`This device's storage is full: take ${take + 1} of excerpt ${excerpt + 1} and those after it are kept only while this page stays open. SAVE FILE now.`);
    });
    timer.current = setTimeout(next, BETWEEN_MS);
  };

  const start = () => {
    const x = sRef.current;
    if (x && x.excerpts.some((it) => it.takes.length) && !studyDone(x) && !window.confirm("Start a new study? The one under way (its takes) will be deleted from this device: SAVE FILE first if you want to keep it.")) return;
    clearStudy();
    setNote("");
    setLast(null);
    put(newStudy(app, bpmOf));
    setPhase("intro");
  };

  const saveFile = () => {
    const x = sRef.current;
    if (!x) return;
    const y = mark(x, "export");
    put(y);
    const text = studyText(y);
    const name = studyFileName();
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const file = typeof File !== "undefined" ? new File([text], name, { type: "application/json" }) : null;
    if (file && nav.share && nav.canShare?.({ files: [file] })) {
      void nav.share({ files: [file], title: name }).then(
        () => setNote(`${name} shared.`),
        () => setNote("Not shared. Try again, or COPY."),
      );
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNote(`${name} saved (${Math.round(text.length / 1024)} KB): send it to the developer.`);
  };
  const copy = () => {
    const x = sRef.current;
    if (!x) return;
    const text = `WTC STUDY · ${x.startedAt.slice(0, 10)}\n${studyText(x)}`;
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(
        () => setNote(`The study copied (${Math.round(text.length / 1024)} KB). Paste it in a message to the developer.`),
        () => setNote("Could not copy: use SAVE FILE."),
      );
    else setNote("Could not copy here: use SAVE FILE.");
  };

  const leave = () => {
    pause();
    hostRef.current.restore();
  };

  const x = s;
  const progress = x && !studyDone(x) ? `Excerpt ${x.pos.excerpt + 1}/${x.excerpts.length} · take ${Math.min(x.pos.take + 1, x.takesPer)}/${x.takesPer}` : "";
  return {
    s,
    phase,
    active: ACTIVE.includes(phase),
    progress: phase === "between" && last ? `Excerpt ${x!.pos.take === 0 ? x!.pos.excerpt : x!.pos.excerpt + 1}/${x!.excerpts.length} · take ${last.take}/${x!.takesPer}` : phase === "listen" ? `Excerpt ${x!.pos.excerpt + 1}/${x!.excerpts.length} · listening` : progress,
    last,
    note,
    start,
    play: () => go(false),
    listen: () => go(true),
    pause,
    resume: () => (put(mark(sRef.current!, "resume")), go(false)),
    leave,
    ended,
    saveFile,
    copy,
  };
}

const voiceOf = (it: StudyItem) => fugueById(it.piece).voiceNames[it.voice]?.toLowerCase() ?? "";
/** "II/7 · soprano · bars 41–46". */
export const excerptName = (it: StudyItem) => `${pieceShort(it.piece)} · ${voiceOf(it)} · bars ${it.fromBar}–${it.toBar}`;
const tallyLine = (t: TakeStats) => `${t.right}/${t.of} right · ${t.perfect} PERFECT · ${t.wrong} wrong · ${t.missed} missed · ${t.stray} stray`;

/** The 2 s between takes, over the box: the take's tally. */
export function StudyCard({ st }: { st: Study }) {
  if (st.phase !== "between" || !st.last || !st.s) return null;
  const t = st.last;
  const doneExcerpt = st.s.pos.take === 0;
  return (
    <div className="lab-study-card" id="lab-study-card" aria-live="polite">
      <b>{st.progress}</b>
      <span className="lab-study-big">{Math.round(t.rightPct)}%</span>
      <span>{tallyLine(t)}</span>
      <span className="lab-dim">{studyDone(st.s) ? "The study is done." : doneExcerpt ? "Excerpt done: the next one comes." : "Next take…"}</span>
    </div>
  );
}

export function StudyTab({ st }: { st: Study }) {
  const s = st.s;
  const preset = configById(STUDY_PRESET);
  const files = s && (
    <div className="lab-row">
      <button type="button" id="lab-study-save" className="lab-btn" onClick={st.saveFile}>
        SAVE FILE
      </button>
      <button type="button" id="lab-study-copy" className="lab-btn" onClick={st.copy}>
        COPY
      </button>
      <span className="lab-dim">The whole study as one file ({studyFileName()}): send it to the developer, at the end or at any time.</span>
    </div>
  );
  const head = <p className="lab-dim">Ten short excerpts, each played ten times in a row: the developer sees what you learn, what stays hard and which mistakes come back. One setting for all: {s?.preset.name ?? preset?.name}, piano, no reading marks, band time fixed, the game's tempo (your own settings are put back afterwards). About 35 minutes; pause whenever you like, even for days: it is saved on this phone after every take.</p>;
  if (!s || st.phase === "none")
    return (
      <div className="lab-study">
        {head}
        <button type="button" id="lab-study-start" className="lab-study-go" onClick={st.start}>
          START STUDY
        </button>
      </div>
    );
  const it = s.excerpts[s.pos.excerpt];
  const n = s.excerpts.length;
  const list = (
    <div className="lab-study-list">
      {s.excerpts.map((x, i) => {
        const stats = x.takes.map((l, j) => takeStats(l, j + 1));
        return (
          <p key={x.id} className={`lab-line${i === s.pos.excerpt && !studyDone(s) ? " head" : ""}`}>
            {i + 1}. {excerptName(x)} · {x.skill} · {x.takes.length}/{s.takesPer}
            {stats.length ? ` · right ${stats.map((t) => Math.round(t.rightPct)).join(" ")}%` : ""}
          </p>
        );
      })}
    </div>
  );
  return (
    <div className="lab-study">
      {st.note && <p className="lab-note">{st.note}</p>}
      {st.phase === "done" || studyDone(s) ? (
        <>
          <h2 className="lab-study-title">THE STUDY IS DONE</h2>
          <p>Thank you. Save the file and send it to the developer.</p>
          {files}
          {list}
          <button type="button" className="lab-btn" onClick={st.start}>
            START A NEW STUDY
          </button>
        </>
      ) : (
        <>
          <h2 className="lab-study-title" id="lab-study-title">
            {st.phase === "paused" ? `PAUSED · Excerpt ${s.pos.excerpt + 1}/${n} · take ${s.pos.take + 1}/${s.takesPer}` : `Excerpt ${s.pos.excerpt + 1} of ${n} · ${excerptName(it)}`}
          </h2>
          <p>
            <b>{it.skill.toUpperCase()}</b> · {it.tests}
          </p>
          <p className="lab-dim">
            {excerptName(it)} · ♩ {Math.round(it.bpm)} · {excerptSeconds(it, it.bpm).toFixed(0)} s · {s.takesPer} takes in a row, each after the count-in, the next by itself 2 s after.{it.heard ? ` Heard ${it.heard}×.` : ""}
          </p>
          <div className="lab-row">
            {st.phase === "paused" ? (
              <button type="button" id="lab-study-play" className="lab-study-go" onClick={st.resume}>
                ▶ RESUME (take {s.pos.take + 1})
              </button>
            ) : (
              <>
                <button type="button" id="lab-study-play" className="lab-study-go" onClick={st.play}>
                  ▶ PLAY
                </button>
                <button type="button" id="lab-study-hear" className="lab-btn" onClick={st.listen}>
                  HEAR IT FIRST
                </button>
              </>
            )}
            <button type="button" id="lab-study-leave" className="lab-btn" onClick={st.leave}>
              BACK TO MY SETTINGS
            </button>
          </div>
          {files}
          {list}
          <p className="lab-dim">
            PAUSE (top right) stops at any moment; a take stopped is played again. HEAR IT FIRST plays the excerpt once by itself (not counted). <button type="button" className="lab-link" onClick={st.start}>Start the study over</button>
          </p>
        </>
      )}
    </div>
  );
}
