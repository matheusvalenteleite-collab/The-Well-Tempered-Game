/**
 * P41: an on-screen piano, played with the mouse or the computer's keys (the owner's idea). The
 * bottom letter row and the row above it are laid out as a keyboard's white and black keys (Z S X
 * D C V G B H N J M , then L . ; /: seventeen semitones); clicking a key on screen sets where the
 * row begins, sliding it chromatically: the clicked note lands on Z if it is white, on S if black.
 * [ and ] move the row an octave. The keys are read by position (`KeyboardEvent.code`), so any
 * layout works. For now it only sounds (play along with a piece); writing notes with it is to come.
 */
import { useEffect, useRef, useState } from "react";
import { audio } from "./shared.ts";

const ROW: Record<string, number> = { KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16 };
const LABEL: Record<string, string> = { KeyZ: "Z", KeyS: "S", KeyX: "X", KeyD: "D", KeyC: "C", KeyV: "V", KeyG: "G", KeyB: "B", KeyH: "H", KeyN: "N", KeyJ: "J", KeyM: "M", Comma: ",", KeyL: "L", Period: ".", Semicolon: ";", Slash: "/" };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const black = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
export const pitchName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
/** The note Z plays, given the key clicked. */
const baseOf = (anchor: number) => (black(anchor) ? anchor - 1 : anchor);

const LOW = 36; // C2
const HIGH = 84; // C6

export function PianoKeys({ storeKey = "wtg.piano.anchor" }: { storeKey?: string }) {
  const [anchor, setAnchorState] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(storeKey));
      return v >= LOW && v <= HIGH ? v : 60;
    } catch {
      return 60;
    }
  });
  const setAnchor = (m: number) => {
    const x = Math.max(LOW, Math.min(HIGH, m));
    setAnchorState(x);
    try {
      localStorage.setItem(storeKey, String(x));
    } catch {
      // not kept
    }
  };
  const [down, setDown] = useState<Set<number>>(new Set());
  const held = useRef(new Map<string, Promise<() => void>>());
  const press = (id: string, m: number) => {
    if (held.current.has(id)) return;
    held.current.set(id, audio.hold(pitchName(m)));
    setDown((d) => new Set(d).add(m));
  };
  const release = (id: string, m: number) => {
    const h = held.current.get(id);
    if (!h) return;
    held.current.delete(id);
    void h.then((off) => off());
    setDown((d) => {
      const n = new Set(d);
      n.delete(m);
      return n;
    });
  };
  const base = baseOf(anchor);
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    const playing = new Map<string, number>();
    const skip = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return e.ctrlKey || e.metaKey || e.altKey || (t && (["TEXTAREA", "INPUT", "SELECT"].includes(t.tagName) || t.isContentEditable));
    };
    const onDown = (e: KeyboardEvent) => {
      if (skip(e)) return;
      if (e.code === "BracketLeft" || e.code === "BracketRight") {
        setAnchor(baseRef.current + (e.code === "BracketLeft" ? -12 : 12));
        e.preventDefault();
        return;
      }
      const off = ROW[e.code];
      if (off === undefined) return;
      e.preventDefault();
      if (e.repeat || playing.has(e.code)) return;
      const m = baseRef.current + off;
      playing.set(e.code, m);
      press(e.code, m);
    };
    const onUp = (e: KeyboardEvent) => {
      const m = playing.get(e.code);
      if (m === undefined) return;
      playing.delete(e.code);
      release(e.code, m);
    };
    const all = () => {
      for (const [code, m] of playing) release(code, m);
      playing.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", all);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", all);
      all();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyFor = new Map<number, string>(Object.entries(ROW).map(([code, off]) => [base + off, LABEL[code]]));
  const whites: number[] = [];
  for (let m = LOW; m <= HIGH; m++) if (!black(m)) whites.push(m);
  const W = 24;
  return (
    <div className="piano">
      <p className="muted piano-help">
        Click a key to set where <kbd>Z</kbd> begins (now {pitchName(base)}); play with <kbd>Z S X D C V G B H N J M ,</kbd> and on with <kbd>L . ; /</kbd>; <kbd>[</kbd> <kbd>]</kbd> an octave down or up.
      </p>
      <div className="piano-scroll">
        <div className="piano-keys" style={{ width: whites.length * W }} role="group" aria-label="Piano">
          {whites.map((m, i) => (
            <button
              key={m}
              className={`pk white${down.has(m) ? " down" : ""}${m === anchor ? " anchor" : ""}`}
              style={{ left: i * W, width: W }}
              aria-label={pitchName(m)}
              onPointerDown={(e) => { e.preventDefault(); setAnchor(m); press(`p${m}`, m); }}
              onPointerUp={() => release(`p${m}`, m)}
              onPointerLeave={() => release(`p${m}`, m)}
            >
              {keyFor.get(m) && <span className="pk-letter">{keyFor.get(m)}</span>}
              {m % 12 === 0 && !keyFor.get(m) && <span className="pk-name">{pitchName(m)}</span>}
            </button>
          ))}
          {whites.map((m, i) =>
            m + 1 <= HIGH && black(m + 1) ? (
              <button
                key={m + 1}
                className={`pk black${down.has(m + 1) ? " down" : ""}${m + 1 === anchor ? " anchor" : ""}`}
                style={{ left: (i + 1) * W - W * 0.32, width: W * 0.64 }}
                aria-label={pitchName(m + 1)}
                onPointerDown={(e) => { e.preventDefault(); setAnchor(m + 1); press(`p${m + 1}`, m + 1); }}
                onPointerUp={() => release(`p${m + 1}`, m + 1)}
                onPointerLeave={() => release(`p${m + 1}`, m + 1)}
              >
                {keyFor.get(m + 1) && <span className="pk-letter">{keyFor.get(m + 1)}</span>}
              </button>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
