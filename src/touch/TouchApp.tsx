/**
 * The touch game. Step 2 (D159), subject mode in easy: the music box in the upper half, the play area
 * for the thumbs in the lower half; the player learns the subject and the answer with the notes in
 * view, then plays the fugue's eight entries from memory. Only what the player plays sounds.
 */
import { useEffect, useRef, useState } from "react";
import { MusicBox, type BoxNote, type Frame } from "./MusicBox.tsx";
import { PlayArea, type ThumbsRef } from "./PlayArea.tsx";
import { Chip } from "./chip.ts";
import { FUGUE, keyName, type TouchEntry } from "./fugue.ts";
import { easyOptions, judge, judgedNotes, score, thumbPitch, type JudgedNote } from "./judge.ts";
import { PASS, shown, stages, type Stage } from "./subject-mode.ts";

const TEMPOS = [48, 60, 72];
const STAGES = stages(FUGUE);
const MEMORY = STAGES.findIndex((s) => s.kind === "memory");

type Phase =
  | { kind: "title" }
  | { kind: "card"; stage: number; pos: number }
  | { kind: "play"; stage: number; pos: number }
  | { kind: "result"; stage: number; pos: number; hit: number; of: number }
  | { kind: "end" };

const entryOf = (stage: number, pos: number): TouchEntry => FUGUE.entries[STAGES[stage].entries[pos]];
const where = (e: TouchEntry) => `${FUGUE.voiceNames[e.voice].toUpperCase()} · BAR ${e.bar} · ${keyName(e.key)}`;
const passed = (hit: number, of: number) => hit >= PASS * of;

const rangeOf = (e: TouchEntry) => ({ lo: Math.min(...e.notes.map((n) => n[2])), hi: Math.max(...e.notes.map((n) => n[2])) });

function boxNotes(e: TouchEntry, kind: Stage["kind"]): (JudgedNote & BoxNote)[] {
  return judgedNotes(e.notes, FUGUE.tpq).map((n, i) => ({ ...n, shown: shown(kind, i, e.notes[i][3]) }));
}

/** The tick a few beats before the entry: the count-in. */
const countFrom = (e: TouchEntry) => Math.floor(e.on / FUGUE.tpq) * FUGUE.tpq - 4 * FUGUE.tpq;

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [bpm, setBpm] = useState(60);
  const [golds, setGolds] = useState<boolean[]>([]);
  const frame = useRef<Frame>({ now: 0, tps: 1, key: "c", voice: 1, notes: [], cursor: null });
  const thumbs = useRef<ThumbsRef>({ touches: new Map(), height: 1 });
  const chip = useRef<Chip | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);

  // On a card, the box shows what is coming: the notes in view at the count-in.
  useEffect(() => {
    shownAt.current = performance.now();
    if (phase.kind !== "card") return;
    const e = entryOf(phase.stage, phase.pos);
    frame.current = { now: countFrom(e) + 2 * FUGUE.tpq, tps: 1, key: e.key, voice: e.voice, notes: boxNotes(e, STAGES[phase.stage].kind), cursor: null, range: rangeOf(e) };
  }, [phase]);

  // Playing one entry: the beat on the audio clock, the thumb judged against the line every frame.
  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const ch = chip.current;
    const stage = STAGES[phase.stage];
    const e = entryOf(phase.stage, phase.pos);
    const beat = FUGUE.tpq;
    const tps = (FUGUE.tpq * bpm) / 60;
    const opt = easyOptions(FUGUE.tpq, bpm);
    const notes = boxNotes(e, stage.kind);
    const range = rangeOf(e);
    const { lo, hi } = range;
    const start = countFrom(e);
    const entryBeat = start + 4 * beat;
    const end = e.end + beat;
    const T0 = ch.ctx.currentTime + 0.15;
    const tickAt = (t: number) => start + (t - T0) * tps;
    const timeAt = (tick: number) => T0 + (tick - start) / tps;
    let nextBeat = start;
    let raf = 0;

    const loop = () => {
      while (nextBeat <= end && timeAt(nextBeat) < ch.ctx.currentTime + 0.25) {
        ch.tick(timeAt(nextBeat), nextBeat % (4 * beat) === 0, nextBeat < entryBeat ? 0.16 : 0.06);
        nextBeat += beat;
      }
      const { touches, height } = thumbs.current;
      let latest = null as null | { y: number; t0: number };
      for (const t of touches.values()) if (!latest || t.t0 > latest.t0) latest = t;
      const cursor = latest ? thumbPitch(latest.y, height, lo, hi) : null;
      // Judged on the clock the player hears, so a thumb in time with the sound is in time.
      const now = tickAt(ch.heard());
      for (const s of judge(notes, now, cursor, opt)) {
        const n = notes[s.index];
        ch.note(n.midi, timeAt(s.start), (n.on + n.dur - s.start) / tps);
      }
      frame.current = { now, tps, key: e.key, voice: e.voice, notes, cursor, range };
      if (count.current) count.current.textContent = now < entryBeat ? String(Math.min(4, Math.ceil((entryBeat - now) / beat))) : "";
      if (now > end) {
        const s = score(notes);
        if (stage.kind === "memory") setGolds((g) => Object.assign([...g], { [phase.pos]: passed(s.hit, s.of) }));
        setPhase({ kind: "result", stage: phase.stage, pos: phase.pos, hit: s.hit, of: s.of });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (count.current) count.current.textContent = "";
    };
  }, [phase, bpm]);

  const begin = (stage: number) => {
    if (stage === MEMORY) setGolds([]);
    setPhase({ kind: "card", stage, pos: 0 });
  };

  const advance = () => {
    // A touch starts the sound: browsers allow audio only after one.
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
    if (performance.now() - shownAt.current < 350) return;
    if (phase.kind === "title") begin(0);
    else if (phase.kind === "card") setPhase({ kind: "play", stage: phase.stage, pos: phase.pos });
    else if (phase.kind === "result") {
      const st = STAGES[phase.stage];
      if (st.kind === "learn") passed(phase.hit, phase.of) ? begin(phase.stage + 1) : setPhase({ kind: "card", stage: phase.stage, pos: 0 });
      else if (phase.pos + 1 < st.entries.length) setPhase({ kind: "card", stage: phase.stage, pos: phase.pos + 1 });
      else setPhase({ kind: "end" });
    } else if (phase.kind === "end") begin(MEMORY);
  };

  const stageTitle = phase.kind === "title" || phase.kind === "end" ? "SUBJECT MODE" : STAGES[phase.stage].title;
  const hudKey = phase.kind === "card" || phase.kind === "play" || phase.kind === "result" ? keyName(entryOf(phase.stage, phase.pos).key) : "EASY";
  const hint = phase.kind === "play" ? "HOLD · SLIDE" : "TAP";

  return (
    <div className="tg-app">
      <MusicBox
        fugue={FUGUE}
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">{stageTitle}</span>
            <span className="tg-hud-bar">{hudKey}</span>
          </>
        }
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind !== "play" && <Card phase={phase} bpm={bpm} setBpm={setBpm} golds={golds} skip={() => begin(MEMORY)} />}
      </MusicBox>
      <PlayArea thumbs={thumbs} onTap={advance} hint={hint} />
      <div className="tg-upright" role="alert">
        Turn the phone upright
      </div>
    </div>
  );
}

function Card({ phase, bpm, setBpm, golds, skip }: { phase: Exclude<Phase, { kind: "play" }>; bpm: number; setBpm: (n: number) => void; golds: boolean[]; skip: () => void }) {
  if (phase.kind === "title")
    return (
      <div className="tg-card">
        <h1>{FUGUE.title.toUpperCase()}</h1>
        <p className="tg-card-sub">Book I · BWV 847</p>
        <p>Play the subject wherever it enters. You hear only what you play.</p>
        <p>Hold a thumb down in the lower half and slide it: higher is higher. Either thumb will do.</p>
        <div className="tg-tempo" role="group" aria-label="Tempo">
          {TEMPOS.map((t) => (
            <button key={t} type="button" id={`tempo-${t}`} className={t === bpm ? "on" : ""} onClick={() => setBpm(t)}>
              <span className="tg-q">♩</span>={t}
            </button>
          ))}
        </div>
        <p className="tg-card-go">TAP BELOW TO START</p>
        <button type="button" id="skip-memory" className="tg-link" onClick={skip}>
          Skip to the entries from memory
        </button>
      </div>
    );
  if (phase.kind === "end") {
    const n = golds.filter(Boolean).length;
    return (
      <div className="tg-card">
        <h1>{n} OF {FUGUE.entries.length} IN GOLD</h1>
        <div className="tg-golds">
          {FUGUE.entries.map((e, i) => (
            <span key={i} className={golds[i] ? "gold" : ""} title={where(e)}>
              {e.bar}
            </span>
          ))}
        </div>
        <p>Every entry of the subject in the fugue, by bar.</p>
        <p className="tg-card-go">TAP BELOW TO PLAY THEM AGAIN</p>
      </div>
    );
  }
  const st = STAGES[phase.stage];
  const e = entryOf(phase.stage, phase.pos);
  if (phase.kind === "card")
    return (
      <div className="tg-card tg-card-low">
        <h1>{st.kind === "memory" ? `ENTRY ${phase.pos + 1} OF ${st.entries.length}` : st.title}</h1>
        <p className="tg-card-sub">{where(e)}</p>
        <p>
          {st.kind === "memory"
            ? e.notes.some((n) => n[3])
              ? "From memory. Bach changes a few notes here: those stay in view."
              : "From memory. Only the first note is in view."
            : e.form === "answer"
              ? "The answer: the subject a fifth higher, with one note changed. Follow the notes."
              : "Follow the notes. The short ones come by themselves while your thumb is close."}
        </p>
        <p className="tg-card-go">TAP BELOW TO PLAY</p>
      </div>
    );
  const ok = passed(phase.hit, phase.of);
  return (
    <div className="tg-card tg-card-low">
      <h1 className={ok ? "tg-gold" : ""}>{st.kind === "learn" ? (ok ? "LEARNED" : "AGAIN") : ok ? "GOLD" : "NOT YET"}</h1>
      <p className="tg-card-sub">
        {phase.hit} OF {phase.of} NOTES · {Math.round(PASS * 100)}% FOR {st.kind === "learn" ? "THE NEXT STEP" : "GOLD"}
      </p>
      <p className="tg-card-go">{st.kind === "learn" && !ok ? "TAP BELOW TO TRY AGAIN" : "TAP BELOW TO GO ON"}</p>
    </div>
  );
}
