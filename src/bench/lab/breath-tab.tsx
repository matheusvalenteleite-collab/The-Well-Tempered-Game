/**
 * D323, THE LAB's BREATH tab: the headphones note, the microphone (its permission, what processing the
 * browser really turned off), the instrument, where the pitch comes from, CALIBRATION (breathe normally,
 * blow softly, blow strongly, and a LEAK TEST of the speaker), a live meter, and the breath's parameters.
 * Its settings live on the device under their own key (not the lab's setup), so the tab stands alone.
 */
import { useEffect, useRef, useState } from "react";
import type { Chip } from "../../touch/chip.ts";
import { BREATH_DEFAULTS, CAL_DEFAULT, dbOf, leakOf, msOf, openDbOf, solveCal, type BreathCal, type BreathLook, type BreathTuning } from "./breath-dsp.ts";
import { breathMic, type BreathMic } from "./breath-mic.ts";
import { WINDS, WindVoice, type WindKind } from "./breath-voice.ts";
import type { PitchMode } from "./breath.ts";

const KEY = "tb-lab-breath-v1";

export interface BreathSetup {
  kind: WindKind;
  pitch: PitchMode;
  rise: boolean;
  cal: BreathCal;
  tune: BreathTuning;
}

export function loadBreath(): BreathSetup {
  let s: Partial<BreathSetup> = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<BreathSetup>;
  } catch {
    /* defaults */
  }
  return {
    kind: s.kind === "traverso" ? "traverso" : "recorder",
    pitch: s.pitch === "voice" ? "voice" : "rows",
    rise: s.rise ?? true,
    cal: { ...CAL_DEFAULT, ...(s.cal ?? {}) },
    tune: { ...BREATH_DEFAULTS, ...(s.tune ?? {}) },
  };
}
function saveBreath(s: BreathSetup) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* this visit */
  }
}

/** Opens the lab's microphone in the chip's context with the saved calibration and parameters. */
export async function openBreathMic(chip: Chip): Promise<BreathMic> {
  const mic = breathMic(chip.ctx);
  const s = loadBreath();
  mic.analyser.setCal(s.cal);
  mic.analyser.setTune(s.tune);
  await mic.open();
  return mic;
}

export function micProblem(mic: BreathMic): string {
  if (mic.state === "denied") return "The microphone was refused. To allow it: Settings → Apps → Safari → Microphone (or the aA menu → Website Settings → Microphone → Allow), then reload the lab.";
  if (mic.state === "unavailable") return `No microphone: ${mic.error || "this browser gives none here"}. BREATH needs the page over https (as it is published) and a microphone.`;
  return "";
}

type Step = "rest" | "soft" | "strong" | "leak";
const STEPS: Record<Step, { s: number; say: string }> = {
  rest: { s: 8, say: "Breathe normally, three breaths, the phone held as you play (thumbs on the screen, its bottom edge near your mouth)." },
  soft: { s: 4, say: "Blow SOFTLY across the bottom edge, as for a quiet note." },
  strong: { s: 4, say: "Blow STRONGLY, as for a loud note (not your hardest)." },
  leak: { s: 2.5, say: "Stay silent: the phone plays a note through what you listen with." },
};

export function BreathTab({ ensureChip, onSetup }: { ensureChip: () => Chip; onSetup?: (s: BreathSetup) => void }) {
  const [s, setS] = useState<BreathSetup>(loadBreath);
  const [mic, setMic] = useState<BreathMic | null>(null);
  const [, setTick] = useState(0);
  const [step, setStep] = useState<{ step: Step; until: number } | null>(null);
  const [msg, setMsg] = useState("");
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const hist = useRef<BreathLook[]>([]);
  const collect = useRef<{ rest: number[]; soft: number[]; strong: number[]; mic: number[]; out: number[] }>({ rest: [], soft: [], strong: [], mic: [], out: [] });

  const set = (p: Partial<BreathSetup>) =>
    setS((cur) => {
      const next = { ...cur, ...p };
      saveBreath(next);
      mic?.analyser.setCal(next.cal);
      mic?.analyser.setTune(next.tune);
      onSetup?.(next);
      return next;
    });

  // The live meter while the mic is on.
  useEffect(() => {
    if (!mic || mic.state !== "on") return;
    const off = mic.listen((l) => {
      hist.current.push(l);
      if (hist.current.length > 300) hist.current.shift();
    });
    let raf = 0;
    const draw = () => {
      const c = canvas.current;
      const g = c?.getContext("2d");
      if (c && g) {
        const w = (c.width = c.clientWidth * devicePixelRatio);
        const h = (c.height = c.clientHeight * devicePixelRatio);
        g.fillStyle = "#11100e";
        g.fillRect(0, 0, w, h);
        const cal = mic.analyser.cal;
        const lo = Math.min(cal.floorDb - 10, -80);
        const hi = -3;
        const y = (db: number) => h - ((Math.max(lo, Math.min(hi, db)) - lo) / (hi - lo)) * h;
        const open = openDbOf(cal);
        g.fillStyle = "rgba(255,210,63,0.12)";
        hist.current.forEach((l, i) => l.open && g.fillRect((i / 300) * w, 0, w / 300 + 1, h));
        g.strokeStyle = "#ffd23f";
        g.beginPath();
        g.moveTo(0, y(open));
        g.lineTo(w, y(open));
        g.stroke();
        g.strokeStyle = "rgba(236,234,217,0.4)";
        g.beginPath();
        g.moveTo(0, y(cal.strongDb));
        g.lineTo(w, y(cal.strongDb));
        g.stroke();
        g.strokeStyle = "#ecead9";
        g.lineWidth = 2 * devicePixelRatio;
        g.beginPath();
        hist.current.forEach((l, i) => g[i ? "lineTo" : "moveTo"]((i / 300) * w, y(l.envDb)));
        g.stroke();
        g.fillStyle = "#ff7fbf";
        hist.current.forEach((l, i) => l.events.some((e) => e.kind === "tongue") && g.fillRect((i / 300) * w - 1, 0, 3 * devicePixelRatio, 8 * devicePixelRatio));
        const l = hist.current.at(-1);
        g.font = `${11 * devicePixelRatio}px ui-monospace, Menlo, monospace`;
        g.fillStyle = "#ecead9";
        if (l) g.fillText(`${l.envDb.toFixed(0)} dB · blow-ness ${l.noisy.toFixed(2)} · ${l.open ? "BREATH ON" : "off"}`, 6 * devicePixelRatio, 14 * devicePixelRatio);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [mic, mic?.state]);

  const turnOn = async () => {
    setMsg("");
    const chip = ensureChip();
    const m = await openBreathMic(chip);
    setMic(m);
    setTick((n) => n + 1);
    if (m.state !== "on") setMsg(micProblem(m));
  };

  // A calibration step: collect the envelope's levels for its time, then solve.
  const run = async (st: Step) => {
    let m = mic;
    if (!m || m.state !== "on") {
      await turnOn();
      m = breathMic(ensureChip().ctx);
      if (m.state !== "on") return;
    }
    const mm = m;
    const c = collect.current;
    if (st === "rest" || st === "soft" || st === "strong") c[st] = [];
    let voice: WindVoice | null = null;
    if (st === "leak") {
      c.mic = [];
      c.out = [];
      mm.analyser.setCal({ ...mm.analyser.cal, leak: 0 });
      const chip = ensureChip();
      voice = new WindVoice(chip.ctx, chip.input, s.kind, false);
      voice.setPitch(72, 0);
      voice.setBreath(0.8, true);
      mm.outMs = () => voice!.outMs();
    }
    const t0 = performance.now();
    const off = mm.listen((l) => {
      if (performance.now() - t0 < 300) return;
      if (st === "leak") c.mic.push(msOf(l.envDb)), c.out.push(voice!.outMs());
      else c[st].push(l.envDb);
    });
    setStep({ step: st, until: t0 + STEPS[st].s * 1000 });
    await new Promise((r) => setTimeout(r, STEPS[st].s * 1000));
    off();
    setStep(null);
    if (voice) {
      voice.dispose();
      mm.outMs = () => 0;
      const leak = leakOf(c.mic, c.out);
      // Below the room's own level the leak is nothing heard.
      const heard = dbOf(c.mic.reduce((a, b) => a + b, 0) / Math.max(1, c.mic.length));
      const k = heard < s.cal.floorDb + 3 ? 0 : leak;
      set({ cal: { ...s.cal, leak: k } });
      mm.analyser.setCal({ ...s.cal, leak: k });
      setMsg(k ? `The mic hears the speaker: ${heard.toFixed(0)} dB while the note played. It is taken off the breath (factor ${k.toFixed(3)}); headphones are better.` : `The mic did not hear the note over the room (${heard.toFixed(0)} dB): headphones, or a quiet speaker. Nothing to take off.`);
      return;
    }
    if (st === "strong" || (c.rest.length && c.soft.length && c.strong.length)) {
      const r = solveCal(c.rest, c.soft, c.strong, s.cal.leak);
      set({ cal: r.cal });
      setMsg(r.problems.length ? r.problems.join(" ") : `Calibrated: breathing ${r.cal.floorDb.toFixed(0)} dB, soft ${r.cal.softDb.toFixed(0)} dB, strong ${r.cal.strongDb.toFixed(0)} dB; the breath opens at ${openDbOf(r.cal).toFixed(0)} dB.`);
    }
  };

  const tune = (k: keyof BreathTuning, v: number) => set({ tune: { ...s.tune, [k]: v } });
  const settings = mic?.settings;
  const on = mic?.state === "on";

  return (
    <div className="lab-form lab-breath">
      <p className="lab-note" style={{ gridColumn: "1 / -1", margin: 0 }}>
        🎧 HEADPHONES: the phone's speaker sits beside its microphone, so without headphones the mic hears the instrument (the LEAK TEST below measures it and takes it off, roughly). Wired or USB-C headphones are best; Bluetooth adds delay.
      </p>
      <p className="lab-dim" style={{ gridColumn: "1 / -1", margin: 0 }}>
        A wind instrument: your THUMBS FINGER (choose the note) and your BREATH SOUNDS it. Hold the phone sideways, thumbs on the bars, and blow gently across its bottom edge (the microphone is there, beside the charging port), a few centimetres away, not into it. No breath, no sound; harder is louder and brighter; a new note while you keep blowing is slurred; "tu-tu" or "du-du" with the tongue re-articulates. ▶ PLAY BREATH starts.
      </p>
      <div className="lab-row" style={{ gridColumn: "1 / -1" }}>
        <button type="button" id="lab-breath-mic" className="lab-btn" onClick={() => (on ? (mic!.close(), setMic(null), setTick((n) => n + 1)) : void turnOn())}>
          {on ? "MIC OFF" : "MIC ON"}
        </button>
        <span className="lab-dim" id="lab-breath-micstate">
          {on
            ? `mic on (${mic!.path === "worklet" ? "AudioWorklet" : "AnalyserNode"}, ${mic!.ctx.sampleRate} Hz)${settings ? ` · echo cancellation ${String(settings.echoCancellation ?? "?")} · noise suppression ${String(settings.noiseSuppression ?? "?")} · gain control ${String(settings.autoGainControl ?? "?")}` : ""}`
            : mic?.state === "asking"
              ? "asking…"
              : "mic off"}
        </span>
      </div>
      {msg && (
        <p className="lab-note" id="lab-breath-msg" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {msg}
        </p>
      )}
      <canvas ref={canvas} id="lab-breath-meter" style={{ gridColumn: "1 / -1", width: "100%", height: 90, display: on ? "block" : "none", borderRadius: 6 }} />
      <Seg id="lab-breath-kind" label="Instrument" value={s.kind} options={[["recorder", "RECORDER"], ["traverso", "TRAVERSO"]]} set={(v) => set({ kind: v })} />
      <Seg id="lab-breath-pitch" label="Notes from" value={s.pitch} options={[["rows", "ROWS (as FREE PLAY)"], ["voice", "THE VOICE'S NOTES"]]} set={(v) => set({ pitch: v })} />
      <p className="lab-dim" style={{ gridColumn: "1 / -1", margin: 0 }}>
        {WINDS[s.kind].name}. ROWS: the row under the thumb (FREE PLAY's key, range and octaves). THE VOICE'S NOTES: each thumb landing fingers the next note of the voice in PASSAGE's bars, in order; you choose when and how it sounds.
      </p>
      {s.kind === "recorder" && (
        <div className="lab-row">
          <Toggle id="lab-breath-rise" label="Pitch rises with breath (a recorder goes sharp blown hard)" on={s.rise} set={(v) => set({ rise: v })} />
        </div>
      )}
      <p className="lab-sub" style={{ gridColumn: "1 / -1" }}>CALIBRATION</p>
      <div className="lab-row" style={{ gridColumn: "1 / -1" }}>
        {(["rest", "soft", "strong", "leak"] as Step[]).map((st, i) => (
          <button key={st} type="button" id={`lab-breath-cal-${st}`} className="lab-btn" disabled={!!step} onClick={() => void run(st)}>
            {i + 1} {st === "rest" ? "BREATHE NORMALLY" : st === "soft" ? "BLOW SOFTLY" : st === "strong" ? "BLOW STRONGLY" : "LEAK TEST"}
          </button>
        ))}
        <button type="button" className="lab-btn" onClick={() => (set({ cal: { ...CAL_DEFAULT } }), setMsg("Calibration reset."))}>
          RESET
        </button>
      </div>
      {step && (
        <p className="lab-note" id="lab-breath-step" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {STEPS[step.step].say} ({STEPS[step.step].s} s)
        </p>
      )}
      <p className="lab-dim" id="lab-breath-cal" style={{ gridColumn: "1 / -1", margin: 0 }}>
        Now: breathing {s.cal.floorDb.toFixed(0)} dB · soft {s.cal.softDb.toFixed(0)} dB · strong {s.cal.strongDb.toFixed(0)} dB · opens at {openDbOf(s.cal).toFixed(0)} dB, closes {s.tune.hysteresisDb} dB under · speaker leak {s.cal.leak ? s.cal.leak.toFixed(3) : "none"}
      </p>
      <p className="lab-sub" style={{ gridColumn: "1 / -1" }}>THE BREATH'S PARAMETERS</p>
      <Range id="lab-breath-attack" label={`Rise ${s.tune.attackMs} ms`} min={1} max={30} step={1} value={s.tune.attackMs} set={(v) => tune("attackMs", v)} />
      <Range id="lab-breath-release" label={`Fall ${s.tune.releaseMs} ms`} min={10} max={200} step={5} value={s.tune.releaseMs} set={(v) => tune("releaseMs", v)} />
      <Range id="lab-breath-hyst" label={`Gate hysteresis ${s.tune.hysteresisDb} dB`} min={0} max={15} step={1} value={s.tune.hysteresisDb} set={(v) => tune("hysteresisDb", v)} />
      <Range id="lab-breath-close" label={`Gate closes after ${s.tune.closeMs} ms`} min={10} max={200} step={5} value={s.tune.closeMs} set={(v) => tune("closeMs", v)} />
      <Range id="lab-breath-noisy" label={`Blow-ness needed ${s.tune.minNoisy.toFixed(2)}`} min={0} max={1} step={0.05} value={s.tune.minNoisy} set={(v) => tune("minNoisy", v)} />
      <Range id="lab-breath-dip" label={`Tongue: a dip of ${s.tune.tongueDipDb} dB`} min={3} max={20} step={1} value={s.tune.tongueDipDb} set={(v) => tune("tongueDipDb", v)} />
      <Range id="lab-breath-gap" label={`Tongues at least ${s.tune.tongueGapMs} ms apart`} min={20} max={200} step={5} value={s.tune.tongueGapMs} set={(v) => tune("tongueGapMs", v)} />
      <div className="lab-row">
        <button type="button" className="lab-btn" onClick={() => set({ tune: { ...BREATH_DEFAULTS } })}>
          PARAMETERS TO DEFAULTS
        </button>
      </div>
    </div>
  );
}

function Range({ id, label, min, max, step, value, set }: { id: string; label: string; min: number; max: number; step: number; value: number; set: (v: number) => void }) {
  return (
    <label className="lab-field">
      <span>{label}</span>
      <input type="range" id={id} min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ id, label, on, set }: { id: string; label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="lab-toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={on} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Seg<T extends string>({ id, label, value, options, set }: { id: string; label: string; value: T; options: readonly (readonly [T, string])[]; set: (v: T) => void }) {
  return (
    <div className="lab-field">
      <span>{label}</span>
      <div className="lab-seg" role="group" aria-label={label}>
        {options.map(([v, t]) => (
          <button key={v} type="button" id={`${id}-${v}`} className={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => set(v)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
