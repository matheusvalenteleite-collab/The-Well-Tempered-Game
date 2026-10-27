/**
 * D324, THE LAB's TABLE tab (table.ts): its settings, and the whole screen it plays on (the phone flat
 * on a table, landscape): a canvas taking every pointer, a counter of the touches down, the most seen
 * and the cancels, the latest lines, ✕ to leave. The piece, voice and sound are FREE PLAY's / PASSAGE's.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Chip } from "../../touch/chip.ts";
import type { TouchFugue } from "../../touch/fugue.ts";
import { pianoKeys, TablePlay, type TableOptions } from "./table.ts";
import { freeRows } from "./free.ts";
import { pitchName } from "./replay.ts";

const STORE = "tb-lab-table-v1";
const DEFAULTS: TableOptions = { mode: "fingers", accent: true, scale: "key", octaves: 1, layout: "chromatic", overlap: "legato", sizeVelocity: true };

export function loadTable(): TableOptions {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Partial<TableOptions>;
    return {
      mode: s.mode === "piano" ? "piano" : "fingers",
      accent: s.accent !== false,
      scale: s.scale === "chromatic" ? "chromatic" : "key",
      octaves: s.octaves === 2 ? 2 : 1,
      layout: s.layout === "scale" ? "scale" : "chromatic",
      overlap: s.overlap === "chords" ? "chords" : "legato",
      sizeVelocity: s.sizeVelocity !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveTable(o: TableOptions) {
  try {
    localStorage.setItem(STORE, JSON.stringify(o));
  } catch {
    /* this visit */
  }
}

function Pick<T extends string>({ id, label, value, options, set }: { id: string; label: string; value: T; options: [T, string][]; set: (v: T) => void }) {
  return (
    <div className="lab-field">
      <span>{label}</span>
      <div className="lab-seg" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" id={`${id}-${v}`} className={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => set(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The tab: what to play, and ▶ PLAY ON THE TABLE. */
export function TableTab({ f, voice, o, set, play }: { f: TouchFugue; voice: number; o: TableOptions; set: (o: TableOptions) => void; play: () => void }) {
  const up = (p: Partial<TableOptions>) => {
    const n = { ...o, ...p };
    saveTable(n);
    set(n);
  };
  const rows = freeRows(f, voice, o.scale, o.octaves);
  const keys = pianoKeys(f, voice, o.layout);
  const nm = (m: number) => pitchName(f.id, m);
  return (
    <div className="lab-form">
      <p className="lab-dim" style={{ gridColumn: "1 / -1", margin: 0 }}>
        Lay the phone flat on a table, landscape, and play over it with more than two fingers. FINGERS: four bars, two a hand (middle and index fingers), the pitch the row under the finger; ACCENT makes the index (inner) bars soft and the middle (outer) bars strong. PIANO: keys across the screen, each touch strikes its key, the contact's size as the velocity. A finger landing while another holds joins (no new attack), as in the game; MECHANICS' legato gap and joined sound apply. The counter shows the touches down, the most seen and every iOS cancel (iPhone tracks five). Key, voice and sound: FREE PLAY's. Each event a line in WHAT HAPPENED.
      </p>
      <Pick id="lab-table-mode" label="Prototype" value={o.mode} options={[["fingers", "FINGERS · 4 BARS"], ["piano", "PIANO"]]} set={(mode) => up({ mode })} />
      {o.mode === "fingers" ? (
        <>
          <Pick id="lab-table-accent" label="Attack by bar" value={o.accent ? "on" : "off"} options={[["on", "INNER SOFT · OUTER STRONG"], ["off", "ALL THE SAME"]]} set={(v) => up({ accent: v === "on" })} />
          <Pick id="lab-table-scale" label="Notes" value={o.scale} options={[["key", "THE KEY"], ["chromatic", "CHROMATIC"]]} set={(scale) => up({ scale })} />
          <Pick id="lab-table-oct" label={`Range: ${rows.length} rows, ${nm(rows[0])}–${nm(rows.at(-1)!)}`} value={String(o.octaves) as "1" | "2"} options={[["1", "1 OCTAVE"], ["2", "2 OCTAVES"]]} set={(v) => up({ octaves: Number(v) })} />
        </>
      ) : (
        <>
          <Pick id="lab-table-layout" label={`Keys: ${keys.length}, ${nm(Math.min(...keys.map((k) => k.midi)))}–${nm(Math.max(...keys.map((k) => k.midi)))}`} value={o.layout} options={[["chromatic", "1 OCTAVE, BLACK KEYS"], ["scale", "THE KEY, 1½ OCTAVES"]]} set={(layout) => up({ layout })} />
          <Pick id="lab-table-overlap" label="Overlapping keys" value={o.overlap} options={[["legato", "JOINED (ONE VOICE)"], ["chords", "CHORDS (ALL RING)"]]} set={(overlap) => up({ overlap })} />
          <Pick id="lab-table-size" label="Velocity" value={o.sizeVelocity ? "size" : "fixed"} options={[["size", "CONTACT SIZE"], ["fixed", "THE MIDDLE"]]} set={(v) => up({ sizeVelocity: v === "size" })} />
        </>
      )}
      <div className="lab-row">
        <button type="button" className="lab-start" id="lab-table-play" style={{ fontFamily: "var(--tg-pixel)", fontSize: 9, padding: "9px 12px", color: "var(--tg-bg)", background: "#8fe3b0", border: 0, borderRadius: 2 }} onClick={play}>
          ▶ PLAY ON THE TABLE
        </button>
      </div>
    </div>
  );
}

/** The whole screen it plays on, until ✕. */
export function TableStage({ f, voice, chip, o, line, close }: { f: TouchFugue; voice: number; chip: Chip; o: TableOptions; line: (text: string) => void; close: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const tp = useRef<TablePlay | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [, setTick] = useState(0);
  useEffect(() => {
    const p = new TablePlay(f, voice, chip, o, (l) => {
      line(l);
      setLines((ls) => [...ls.slice(-2), l]);
    });
    tp.current = p;
    (globalThis as { __labTable?: unknown }).__labTable = p;
    void chip.prepare(p.pitches(), p.pitches());
    line(`— TABLE · ${o.mode === "fingers" ? `FINGERS · 4 bars · ${o.accent ? "accent: inner soft, outer strong" : "accent off"} · ${p.name(p.rows[0])}–${p.name(p.rows.at(-1)!)}` : `PIANO · ${o.layout === "chromatic" ? "1 octave chromatic" : "the key, 1½ octaves"} · ${o.overlap} · velocity ${o.sizeVelocity ? "by contact size" : "the middle"}`}`);
    void document.documentElement.requestFullscreen?.().catch(() => {});
    let raf = 0;
    const draw = () => {
      const c = cv.current;
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) (c.width = Math.round(w * dpr)), (c.height = Math.round(h * dpr));
        const g = c.getContext("2d");
        if (g) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          p.paint(g, w, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      p.stop();
      line("— TABLE OVER");
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    };
  }, []);
  const at = (e: PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as const;
  };
  const p = tp.current;
  return (
    <div className="lab-table" role="dialog" aria-label="Table">
      <canvas
        ref={cv}
        id="lab-table-canvas"
        onPointerDown={(e) => {
          e.preventDefault();
          try {
            (e.target as Element).setPointerCapture?.(e.pointerId);
          } catch {
            /* a pointer the browser does not track (a test's) */
          }
          const [fx, fy] = at(e);
          tp.current?.down(e.pointerId, fx, fy, Math.max(e.width || 0, e.height || 0), e.timeStamp);
          setTick((n) => n + 1);
        }}
        onPointerUp={(e) => (tp.current?.up(e.pointerId, e.timeStamp, false), setTick((n) => n + 1))}
        onPointerCancel={(e) => (tp.current?.up(e.pointerId, e.timeStamp, true), setTick((n) => n + 1))}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="lab-table-hud" id="lab-table-count">
        {p ? `${p.active} down · most ${p.maxSeen} · cancels ${p.cancels}${p.bursts ? ` · all-at-once ${p.bursts}` : ""}` : ""}
      </div>
      <div className="lab-table-lines">
        {lines.map((l, i) => (
          <p key={i} className="lab-line">
            {l}
          </p>
        ))}
      </div>
      <button type="button" className="tg-x lab-table-x" aria-label="Close" onClick={close}>
        ✕
      </button>
    </div>
  );
}
