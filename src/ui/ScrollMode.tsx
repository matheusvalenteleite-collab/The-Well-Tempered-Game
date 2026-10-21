/**
 * P45: the default way to watch and hear a piece in the artifacts and the test bench (the owner:
 * "the Gerubach layout mode … the default visualization-playback mode"): the strip of systems under
 * a fixed red playhead, a title card until the music starts, and nothing else on screen. A tap or
 * Space plays and pauses; while paused the strip can be dragged to any bar. A discreet button in the
 * corner leads to the other modes.
 */
import { useEffect, useRef, useState } from "react";
import { audio } from "./shared.ts";
import { ScrollScore, usePlayhead, type ScrollScoreProps } from "./notation/ScrollScore.tsx";

export interface ScrollModeProps {
  /** The title card: a line above, the title, a line below. */
  card: { above?: string; title: string; below?: string };
  score: Omit<ScrollScoreProps, "bar" | "playing" | "onSeek">;
  /** Start the music from bar `from` (0-based); `onBar(b)` as each bar begins, -1 at the end. */
  start(from: number, onBar: (b: number) => void): void;
  stop(): void;
  /** The corner button: the other modes. */
  modes: { id: string; label: string }[];
  /** In strict time (default): the playhead runs on the clock; false for chorales with fermatas. */
  steady?: boolean;
  onMode(id: string): void;
}

export function ScrollMode(p: ScrollModeProps) {
  const head = usePlayhead(() => audio.now, () => audio.barSeconds, p.steady ?? true);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(false);
  const playingRef = useRef(false);
  const toggle = () => {
    if (playingRef.current) {
      playingRef.current = false;
      p.stop();
      head.stop();
      setPlaying(false);
      return;
    }
    const from = head.bar >= p.score.bars - 0.01 ? 0 : Math.floor(head.bar);
    playingRef.current = true;
    setPlaying(true);
    setStarted(true);
    head.setBar(from);
    p.start(from, (b) => {
      if (b < 0) {
        playingRef.current = false;
        head.stop();
        head.setBar(p.score.bars);
        setPlaying(false);
      } else head.onBar(b);
    });
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "Space" || (t && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName))) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", on);
    return () => {
      window.removeEventListener("keydown", on);
      if (playingRef.current) p.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tap = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="scroll-mode"
      onPointerDown={(e) => (tap.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const t = tap.current;
        tap.current = null;
        if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 6 && !(e.target as HTMLElement).closest(".scroll-mode-corner")) toggle();
      }}
    >
      <ScrollScore {...p.score} bar={head.bar} playing={playing} onSeek={(b) => { head.setBar(b); setStarted(true); }} />
      {!started && (
        <div className="scroll-mode-card">
          {p.card.above && <p className="above">{p.card.above}</p>}
          <h1>{p.card.title}</h1>
          {p.card.below && <p className="below">{p.card.below}</p>}
          <p className="hint">tap or press Space to play · drag the score to move</p>
        </div>
      )}
      <div className="scroll-mode-corner">
        <button className="scroll-mode-btn" aria-label="Other views" title="Other views" onClick={() => setMenu(!menu)}>⋯</button>
        {menu && (
          <div className="scroll-mode-menu" role="menu">
            {p.modes.map((m) => (
              <button key={m.id} role="menuitem" onClick={() => { if (playingRef.current) toggle(); setMenu(false); p.onMode(m.id); }}>{m.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
