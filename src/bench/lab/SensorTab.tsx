/**
 * D321, THE LAB's SENSOR tab: the tap-strength test (sensor.ts). Two probes side by side: the CONTACT
 * SIZE (WebKit on iPhone reports UIKit's touch radius as Touch.radiusX/Y and PointerEvent.width/height:
 * a firmer thumb flattens and covers more glass; Essl, Rohs & Kratz, NIME 2010, read four or more
 * loudness levels from it) and the MOTION SENSOR's spike round each touch (the owner's ask). START
 * SENSOR asks for the motion sensor (iOS asks for permission here, from the tap); LEARN: ten soft taps
 * then ten hard ones on the pad (also the per-device calibration of both probes); PRESS AND FLATTEN:
 * hold the thumb and flatten it (the size's growth over a held note); each tap's size, peak, when the
 * peak was available, the sensor's interval and what the touch reported, in a table and two scatters;
 * how well soft and hard separate by each (AUC, mean ± sd, d′); what pressure reads; whether a
 * size-only change fires a move. COPY SENSOR LOG for the lead. PLAY WITH IT: FREE PLAY's attacks from
 * the chosen probe.
 */
import { useEffect, useRef, useState } from "react";
import { MotionHub, posture, pressureKind, sizeOf, stampOf, medianInterval, median, valueOf, type SenseSource, type Separability, type TapLabel, type TapRecord, type TouchInfo } from "./sensor.ts";
import { MECH } from "../mechanics.ts";
import { calibrate } from "./sensor.ts";
import { ADAPT_N, DEFAULT_CAL, loadDynCal, saveDynCal, saveZoneCal, zoneReport, type AdaptiveCal, type DynCal } from "./dynamics.ts";

const GUIDED = 10;
const FLATTEN = 5;
const f2 = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "–" : x.toFixed(d));
type Phase = "idle" | "soft" | "hard" | "flatten" | "done" | ZPhase;
/** D335, LEARN BY ZONE: soft then hard near the box (the inner half of each bar), then near the phone's edge (the outer). */
type ZPhase = "zSoftIn" | "zHardIn" | "zSoftOut" | "zHardOut";
const ZONE_TAPS = 8;
const ZNEXT: Record<ZPhase, Phase> = { zSoftIn: "zHardIn", zHardIn: "zSoftOut", zSoftOut: "zHardOut", zHardOut: "done" };
const isZ = (p: Phase): p is ZPhase => p.startsWith("z");

export function SensorTab({ hub, play, setPlay, source, setSource, copy, adapt, adaptive, setAdaptive }: { hub: MotionHub; play: boolean; setPlay: (v: boolean) => void; source: SenseSource; setSource: (s: SenseSource) => void; copy: () => void; adapt: AdaptiveCal; adaptive: boolean; setAdaptive: (v: boolean) => void }) {
  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [quiet, setQuiet] = useState(false);
  const [stored, setStored] = useState<DynCal>(() => loadDynCal());
  const starts = useRef<{ t: number; force?: number; radiusX?: number; radiusY?: number }[]>([]);
  const pending = useRef<TouchInfo[]>([]);
  const down = useRef(new Map<number, TouchInfo>());
  const pad = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  /** Taps so far in the guided phase. */
  const guided = useRef(0);
  const guide = (p: Phase) => {
    guided.current = 0;
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    hub.onChange = () => setTick((n) => n + 1);
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => {
      hub.onChange = undefined;
      clearInterval(id);
    };
  }, [hub]);

  // TouchEvent's force and radius, matched to the pointer's tap by time (either may come first).
  useEffect(() => {
    const el = pad.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      const t = stampOf(e.timeStamp, performance.now());
      for (const tc of Array.from(e.changedTouches)) {
        const x = { t, force: tc.force, radiusX: tc.radiusX, radiusY: tc.radiusY };
        starts.current.push(x);
        const p = pending.current.find((q) => Math.abs(q.t - t) < 60 && q.force === undefined);
        if (p) Object.assign(p, { force: x.force, radiusX: x.radiusX, radiusY: x.radiusY });
      }
      if (starts.current.length > 40) starts.current.splice(0, 20);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    return () => el.removeEventListener("touchstart", onStart);
  }, []);

  const start = () => {
    void hub.start().then(() => {
      setQuiet(false);
      setTimeout(() => setQuiet(!hub.live), 1500);
    });
  };

  const onDown = (e: React.PointerEvent) => {
    const touch = hub.pointerDown(e.nativeEvent);
    const s = starts.current.find((q) => Math.abs(q.t - touch.t) < 60);
    if (s) Object.assign(touch, { force: s.force, radiusX: s.radiusX, radiusY: s.radiusY });
    down.current.set(e.pointerId, touch);
    pending.current.push(touch);
    if (pending.current.length > 10) pending.current.shift();
    const ph = phaseRef.current;
    const label: TapLabel = ph === "soft" || ph === "hard" || ph === "flatten" ? ph : ph === "zSoftIn" || ph === "zSoftOut" ? "soft" : ph === "zHardIn" || ph === "zHardOut" ? "hard" : "free";
    if (label !== "free") {
      guided.current++;
      if (guided.current >= (ph === "flatten" ? FLATTEN : isZ(ph) ? ZONE_TAPS : GUIDED)) {
        guided.current = 0;
        const next: Phase = isZ(ph) ? ZNEXT[ph] : ph === "soft" ? "hard" : "done";
        phaseRef.current = next;
        setPhase(next);
      } else setTick((n) => n + 1);
    }
    // D336: the last tap of LEARN (soft, hard) or LEARN BY ZONE: one calibration for DYNAMICS, from both zones.
    const last = (ph === "zHardOut" || ph === "hard") && guided.current === 0;
    const per = isZ(ph) ? 2 * ZONE_TAPS : GUIDED;
    hub.measure(touch.t, label, touch, () => {
      pending.current = pending.current.filter((p) => p !== touch);
      // D336: the flow's last tap read: its soft and hard taps (both zones together) the calibration kept, the adaptive references started again from it.
      if (last) {
        const c = calibrate(hub.peaksOf("soft").slice(-per), hub.peaksOf("hard").slice(-per));
        if (c) {
          const d: DynCal = { soft: c.soft, hard: c.hard, from: "learn" };
          saveDynCal(d);
          adapt.reseed(d);
          setStored(d);
        }
      }
    });
  };
  const onMove = (e: React.PointerEvent) => hub.pointerMove(e.nativeEvent, down.current.get(e.pointerId));
  const onUp = (e: React.PointerEvent) => {
    hub.pointerUp(e.nativeEvent, down.current.get(e.pointerId));
    down.current.delete(e.pointerId);
    setTick((n) => n + 1);
  };

  const sep = hub.separation("motion");
  const sepSize = hub.separation("size");
  const cal = hub.calibration(source);
  const pos = posture(hub.samples, hub.samples.at(-1)?.t ?? performance.now());
  const iv = medianInterval(hub.samples.slice(-100));
  const count = (l: TapLabel) => hub.taps.filter((x) => x.label === l).length;
  const avail = hub.taps.filter((x) => x.availMs !== null).map((x) => x.availMs!);
  const flat = hub.taps.filter((x) => x.label === "flatten");
  const growth = flat.map((x) => (sizeOf(x.touch) && x.touch.sizeMax ? x.touch.sizeMax / sizeOf(x.touch)! : null)).filter((g): g is number => g !== null);
  const supported = MotionHub.supported();
  const pk = pressureKind(hub.pressures);
  const zp = isZ(phase);
  const prompt =
    phase === "zSoftIn"
      ? `TAP SOFTLY NEAR THE BOX (the inner half of a bar, toward the middle) · ${guided.current + 1} of ${ZONE_TAPS}`
      : phase === "zHardIn"
        ? `NOW TAP HARD NEAR THE BOX · ${guided.current + 1} of ${ZONE_TAPS}`
        : phase === "zSoftOut"
          ? `TAP SOFTLY NEAR THE PHONE'S EDGE (the outer half) · ${guided.current + 1} of ${ZONE_TAPS}`
          : phase === "zHardOut"
            ? `NOW TAP HARD NEAR THE EDGE · ${guided.current + 1} of ${ZONE_TAPS}`
            : phase === "soft"
      ? `TAP SOFTLY · ${guided.current + 1} of ${GUIDED}`
      : phase === "hard"
        ? `NOW TAP HARD · ${guided.current + 1} of ${GUIDED}`
        : phase === "flatten"
          ? `PRESS, HOLD AND FLATTEN THE THUMB, THEN LIFT · ${guided.current + 1} of ${FLATTEN}`
          : phase === "done"
            ? "DONE · tap freely to see more"
            : "TAP HERE";
  const sepLine = (s: Separability | null, unit: string) =>
    s ? (
      <>
        AUC {f2(s.auc)} · d′ {f2(s.d, 1)} · <b>{s.verdict.toUpperCase()}</b> · soft {f2(s.soft.mean)} ± {f2(s.soft.sd)} {unit} · hard {f2(s.hard.mean)} ± {f2(s.hard.sd)} (n {s.soft.n}/{s.hard.n})
      </>
    ) : (
      <span className="lab-dim">LEARN first (soft, then hard)</span>
    );

  return (
    <div className="lab-sensor">
      <p className="lab-dim">
        Can the phone feel how hard you tap? Two ways are measured side by side: the CONTACT SIZE the screen reports (a firmer thumb flattens and covers more glass) and the MOTION SENSOR's spike (a harder tap shakes the phone). Hold the phone as you play (sideways, both hands) and tap the pad with a thumb; then try it lying on a table.
      </p>
      <div className="lab-row">
        <button type="button" id="lab-sensor-start" className="lab-btn" onClick={start}>
          {hub.permission === "unasked" ? "START SENSOR" : "RESTART SENSOR"}
        </button>
        <button type="button" id="lab-sensor-guided" className="lab-btn" onClick={() => (hub.permission === "unasked" && start(), guide("soft"))}>
          LEARN: SOFT ×{GUIDED}, HARD ×{GUIDED}
        </button>
        <button type="button" id="lab-sensor-zones" className="lab-btn" onClick={() => (hub.permission === "unasked" && start(), guide("zSoftIn"))}>
          LEARN BY ZONE (DYNAMICS)
        </button>
        <button type="button" id="lab-sensor-flatten" className="lab-btn" onClick={() => guide("flatten")}>
          PRESS AND FLATTEN ×{FLATTEN}
        </button>
        <button type="button" className="lab-btn" onClick={() => (hub.clear(), guide("idle"))}>
          CLEAR
        </button>
        <button type="button" id="lab-sensor-copy" className="lab-btn" onClick={copy}>
          COPY SENSOR LOG
        </button>
      </div>
      <p className="lab-sensor-status" id="lab-sensor-status">
        {!supported
          ? "No motion sensor here (this browser has no DeviceMotionEvent: a computer?). The touches are still measured."
          : hub.permission === "denied"
            ? "Motion access denied. On iPhone: close the tab, open the lab again and allow Motion & Orientation Access when asked (or Settings › Safari › Motion & Orientation Access). The contact size still works."
            : hub.permission === "unasked"
              ? "Motion sensor off: tap START SENSOR (the phone may ask to allow motion access). The contact size needs nothing."
              : quiet || (hub.events > 0 && hub.withValues === 0)
                ? `No motion samples arrive (${hub.events} events, none with values): no sensor on this device (a computer?), or the browser withholds it.`
                : hub.live
                  ? `Motion sensor on · ${hub.withValues} samples · every ${f2(iv, 1)} ms (reported interval ${f2(hub.reportedInterval, 3)}) · ${pos === "table" ? "LYING ON A TABLE (the spike may be tiny: try holding it too)" : pos === "held" ? "HELD" : "posture unknown"}`
                  : "Waiting for the first motion sample…"}
        <br />
        Touches: pressure {pk === "none" ? "not yet seen" : pk === "always 0" ? "reads always 0" : pk === "always 0.5" ? "reads always 0.5 (no pressure: the pointer default)" : "varies"} · moves while down {hub.moveCount}, of them size-only (x, y unchanged) {hub.sizeOnlyMoves}
      </p>
      <div className={`lab-pad lab-pad-${phase}${zp ? " lab-pad-zone" : ""}`} ref={pad} id="lab-pad" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {zp && (
          <>
            {/* The bars' halves to tap: the inner (by the box) or the outer (by the phone's edge), both sides. */}
            <i className="lab-zone-mark" style={phase === "zSoftIn" || phase === "zHardIn" ? { left: "10%" } : { left: 0 }} />
            <i className="lab-zone-mark" style={phase === "zSoftIn" || phase === "zHardIn" ? { right: "10%" } : { right: 0 }} />
            <button type="button" className="lab-btn lab-zone-cancel" onPointerDown={(e) => e.stopPropagation()} onClick={() => guide("idle")}>
              CANCEL
            </button>
          </>
        )}
        <b>{prompt}</b>
        <span className="lab-dim">
          soft {count("soft")} · hard {count("hard")} · flatten {count("flatten")} · free {count("free")}
        </span>
      </div>
      <div className="lab-sensor-grid">
        <Scatter taps={hub.taps} src="size" />
        <Scatter taps={hub.taps} src="motion" />
        <div className="lab-sensor-sum" id="lab-sensor-sum">
          <p>
            <b>CONTACT SIZE</b> {sepLine(sepSize, "px")}
          </p>
          <p>
            <b>MOTION PEAK</b> {sepLine(sep, "m/s²")}
          </p>
          <p>
            <b>FLATTEN</b> {growth.length ? `the size grew ×${f2(median(growth))} (median of ${growth.length}; ${f2(Math.min(...growth))}–${f2(Math.max(...growth))}) while held` : "–"}
          </p>
          <ZoneLine taps={hub.taps} />
          <DynCalLine adapt={adapt} stored={stored} adaptive={adaptive} setAdaptive={setAdaptive} forget={() => (saveDynCal(null), saveZoneCal(null), adapt.reseed(DEFAULT_CAL), setStored(loadDynCal()))} />
          <p>
            <b>DELAY</b> the motion peak's sample reached the page {avail.length ? `${f2(median(avail), 0)} ms (median; ${f2(Math.min(...avail), 0)}–${f2(Math.max(...avail), 0)})` : "–"} after the touch; the size is there at the touch
          </p>
        </div>
      </div>
      <div className="lab-row">
        <label className="lab-toggle" htmlFor="lab-sense-play">
          <input type="checkbox" id="lab-sense-play" checked={play} onChange={(e) => setPlay(e.target.checked)} />
          <span>PLAY WITH IT in FREE PLAY</span>
        </label>
        <div className="lab-seg" role="group" aria-label="Strength from">
          {(
            [
              ["size", "CONTACT SIZE"],
              ["motion", "MOTION SENSOR"],
            ] as const
          ).map(([v, t]) => (
            <button key={v} type="button" id={`lab-sense-src-${v}`} className={v === source ? "on" : ""} aria-pressed={v === source} onClick={() => setSource(v)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className="lab-dim">
        {source === "size"
          ? "The size at landing sets the attack (the piano ±4 dB and its layer, the others as D311's landing), at once; flattening the thumb while it holds swells the note (as D311's sustain). "
          : MECH.tapDelayMs > 0
            ? `The note waits up to ${MECH.tapDelayMs} ms for the motion spike, then strikes at its strength. `
            : "The note starts at once, neutral, and is set when the motion spike is read (about 20–40 ms later). "}
        Calibration ({source === "size" ? "size" : "motion"}): {cal ? `soft ${f2(cal.soft)} → 0.25, hard ${f2(cal.hard)} → 0.75 (${cal.from === "session" ? "learned" : "the recent taps"})` : "none yet: LEARN (soft, hard) on this device"}. MECHANICS › SENSOR: the delay, the window read. Each tap in free play is a ◉ TAP line and kept in the sensor log.
      </p>
      <TapTable taps={hub.taps} />
    </div>
  );
}

/** D335: inner against outer taps (the zone's medians, separation, rotation). D336: a report only (they read alike; one calibration). */
function ZoneLine({ taps }: { taps: readonly TapRecord[] }) {
  const r = zoneReport(taps);
  const side = (n: string, z: typeof r.inner) => `${n}: soft ${f2(z.soft.median)} (n ${z.soft.n}), hard ${f2(z.hard.median)} (n ${z.hard.n})${z.sep ? `, AUC ${f2(z.sep.auc)}` : ""}, rot ${f2(z.rot.median, 0)}°/s`;
  return (
    <p id="lab-sensor-zones-sum">
      <b>ZONES</b> {r.verdict === "too few" ? "LEARN BY ZONE to compare the inner and outer halves" : `${side("inner", r.inner)} · ${side("outer", r.outer)} · outer ÷ inner: soft ×${f2(r.ratioSoft)}, hard ×${f2(r.ratioHard)} · ${r.verdict.toUpperCase()}`}
    </p>
  );
}

/** D336: DYNAMICS' one calibration: the references in use now (adaptive: from the recent strikes), the stored one, ADAPTIVE, FORGET. */
function DynCalLine({ adapt, stored, adaptive, setAdaptive, forget }: { adapt: AdaptiveCal; stored: DynCal; adaptive: boolean; setAdaptive: (v: boolean) => void; forget: () => void }) {
  const r = adapt.refs();
  const from = (c: DynCal) => (c.from === "learn" ? "learned" : c.from === "adaptive" ? `adaptive, kept from the last session${c.n ? ` (${c.n} strikes)` : ""}` : "the default");
  return (
    <p id="lab-sensor-dyncal">
      <b>DYNAMICS</b> strike references now: soft {f2(r.soft)} · hard {f2(r.hard)} ({r.from === "adaptive" ? `adaptive: ${r.n} recent strikes` : from(r)}) · started from soft {f2(stored.soft)} · hard {f2(stored.hard)} ({from(stored)}){" "}
      <label className="lab-toggle" htmlFor="lab-dyn-adaptive">
        <input type="checkbox" id="lab-dyn-adaptive" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} />
        <span>ADAPTIVE</span>
      </label>{" "}
      <button type="button" className="lab-btn" onClick={forget}>
        FORGET
      </button>
      <br />
      <span className="lab-dim">One calibration for the whole bar (LEARN or LEARN BY ZONE sets it). ADAPTIVE: the soft and hard references follow your last {ADAPT_N} strikes (their 20th and 80th percentiles), so a new session needs no LEARN; off, the calibration alone.</span>
    </p>
  );
}

const INK: Record<TapLabel, string> = { soft: "#8fb8ff", hard: "#ffb36b", free: "#b9a4ff", play: "#8fe3b0", flatten: "#ff7fbf" };

function Scatter({ taps, src }: { taps: readonly TapRecord[]; src: SenseSource }) {
  const labels: TapLabel[] = ["soft", "hard", "flatten", "free", "play"];
  const pts = taps.map((x) => [x, valueOf(x, src)] as const).filter((p): p is readonly [TapRecord, number] => p[1] !== null);
  const W = 300;
  const H = 150;
  const lo = src === "size" && pts.length ? Math.min(...pts.map((p) => p[1])) * 0.9 : 0;
  const hi = Math.max(lo + 1, ...pts.map((p) => p[1])) * 1.05;
  const colW = (W - 40) / labels.length;
  const y = (v: number) => H - 18 - ((v - lo) / (hi - lo)) * (H - 28);
  return (
    <svg className="lab-scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={src === "size" ? "Contact size per tap" : "Motion peak per tap"}>
      <line x1={36} y1={10} x2={36} y2={H - 18} stroke="currentColor" opacity={0.3} />
      <line x1={36} y1={H - 18} x2={W - 4} y2={H - 18} stroke="currentColor" opacity={0.3} />
      {[0, 0.5, 1].map((k) => (
        <text key={k} x={32} y={y(lo + (hi - lo) * k) + 3} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>
          {(lo + (hi - lo) * k).toFixed(src === "size" ? 0 : 1)}
        </text>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={40 + i * colW + colW / 2} y={H - 6} textAnchor="middle" fontSize={7.5} fill={INK[l]}>
          {l.toUpperCase()}
        </text>
      ))}
      {pts.map(([x, v], i) => {
        const jit = (((i * 37) % 11) / 10 - 0.5) * colW * 0.6;
        return <circle key={i} cx={40 + labels.indexOf(x.label) * colW + colW / 2 + jit} cy={y(v)} r={3} fill={INK[x.label]} opacity={0.85} />;
      })}
      <text x={40} y={8} fontSize={8} fill="currentColor" opacity={0.7}>
        {src === "size" ? "contact size at landing, px" : "motion peak |Δa| m/s², −10…+40 ms"}
      </text>
    </svg>
  );
}

function TapTable({ taps }: { taps: readonly TapRecord[] }) {
  const last = taps.slice(-30).reverse();
  if (!last.length) return null;
  return (
    <div className="lab-tap-table">
      <table>
        <thead>
          <tr>
            <th>tap</th>
            <th>size</th>
            <th>max</th>
            <th>end</th>
            <th>moves</th>
            <th>held</th>
            <th>peak</th>
            <th>at</th>
            <th>ready</th>
            <th>lin</th>
            <th>rot</th>
            <th>every</th>
            <th>type</th>
            <th>pressure</th>
            <th>w×h</th>
            <th>force</th>
            <th>radius</th>
            <th>pose</th>
          </tr>
        </thead>
        <tbody>
          {last.map((x, i) => (
            <tr key={taps.length - i} className={`lab-tap-${x.label}`}>
              <td>{x.label}</td>
              <td>{f2(sizeOf(x.touch), 1)}</td>
              <td>{f2(x.touch.sizeMax, 1)}</td>
              <td>{f2(x.touch.sizeEnd, 1)}</td>
              <td>
                {x.touch.moves ?? 0}/{x.touch.sizeMoves ?? 0}
              </td>
              <td>{f2(x.touch.heldMs, 0)}</td>
              <td>{f2(x.peak)}</td>
              <td>{f2(x.peakAt, 0)}</td>
              <td>{f2(x.availMs, 0)}</td>
              <td>{f2(x.linPeak)}</td>
              <td>{f2(x.rotPeak, 0)}</td>
              <td>{f2(x.intervalMs, 1)}</td>
              <td>{x.touch.pointerType ?? "–"}</td>
              <td>{f2(x.touch.pressure)}</td>
              <td>
                {f2(x.touch.width, 0)}×{f2(x.touch.height, 0)}
              </td>
              <td>{f2(x.touch.force)}</td>
              <td>
                {f2(x.touch.radiusX, 1)}/{f2(x.touch.radiusY, 1)}
              </td>
              <td>{x.posture}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lab-dim">size: the contact's diameter at landing (px: 2 × the touch radius, or the pointer's width and height); max, end: while held; moves: pointer moves while down / those that changed only the size; held: ms; peak: the motion's largest change from rest (m/s², gravity included); at: when (ms after the touch); ready: when the page had it; lin: without gravity; rot: rotation (°/s); every: the sensor's interval (ms).</p>
    </div>
  );
}
