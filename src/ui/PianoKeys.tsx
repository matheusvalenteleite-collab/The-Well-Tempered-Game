/**
 * P41: an on-screen piano, played with the mouse or the computer's keys (the owner's idea). P42
 * (the owner: "the key mapping ought to follow the keyboard white and black keys layout"): the
 * bottom letter row plays consecutive white keys from the one clicked (Z X C V B N M , . /), and
 * each key of the row above, between two of them, the black key between those two where a piano
 * has one (S between Z and X, D between X and C, F between C and V …; silent where there is none,
 * as between E and F). A black key clicked puts the white key below it on Z and itself on S.
 * [ and ] move the row an octave. The keys are read by position (`KeyboardEvent.code`), so any
 * layout works. For now it only sounds (play along with a piece); writing notes with it is to come.
 */
import { useEffect, useRef, useState } from "react";
import { audio } from "./shared.ts";

const WHITE_ROW = ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"];
const BLACK_ROW = ["KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon"];
const LABEL: Record<string, string> = { KeyZ: "Z", KeyX: "X", KeyC: "C", KeyV: "V", KeyB: "B", KeyN: "N", KeyM: "M", Comma: ",", Period: ".", Slash: "/", KeyS: "S", KeyD: "D", KeyF: "F", KeyG: "G", KeyH: "H", KeyJ: "J", KeyK: "K", KeyL: "L", Semicolon: ";" };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const black = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
export const pitchName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
/** The note Z plays, given the key clicked. */
const baseOf = (anchor: number) => (black(anchor) ? anchor - 1 : anchor);
/** The note each computer key plays when Z plays the white key `base` (null: no black key there). */
function keyMap(base: number): Map<string, number | null> {
  const whites: number[] = [];
  for (let m = base; whites.length < WHITE_ROW.length; m++) if (!black(m)) whites.push(m);
  const map = new Map<string, number | null>();
  WHITE_ROW.forEach((code, i) => map.set(code, whites[i]));
  BLACK_ROW.forEach((code, i) => map.set(code, black(whites[i] + 1) ? whites[i] + 1 : null));
  return map;
}

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
      if (!keyMap(baseRef.current).has(e.code)) return;
      e.preventDefault();
      const m = keyMap(baseRef.current).get(e.code);
      if (m === null || m === undefined || e.repeat || playing.has(e.code)) return;
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

  const keyFor = new Map<number, string>([...keyMap(base)].filter((x): x is [string, number] => x[1] !== null).map(([code, m]) => [m, LABEL[code]]));
  const whites: number[] = [];
  for (let m = LOW; m <= HIGH; m++) if (!black(m)) whites.push(m);
  const W = 24;
  return (
    <div className="piano">
      <p className="muted piano-help">
        Click a key to set where <kbd>Z</kbd> begins (now {pitchName(base)}); the bottom row <kbd>Z X C V B N M , . /</kbd> plays the white keys from there, the row above (<kbd>S D F G H J K L ;</kbd>) the black keys between them; <kbd>[</kbd> <kbd>]</kbd> an octave down or up.
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
