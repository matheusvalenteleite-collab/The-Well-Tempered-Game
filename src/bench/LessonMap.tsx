/**
 * D225, the tutorial's screens: Herr Bach's question after the platform ("HAVE YOU PLAYED BEFORE?",
 * until answered on that platform), the LESSON MAP (each platform's track, grouped by mode: ✓ passed,
 * any lesson replayable, the next suggested), and the TUTORIAL button that opens it (the platform
 * screen, ⚙) with its pixel mortarboard.
 */
import { useEffect, useState } from "react";
import { Portrait } from "./Bach.tsx";
import { Glyph } from "./Achievements.tsx";
import { TRACKS } from "./lessons.ts";
import { protoById, type Platform, type ProtoId } from "./protos.ts";
import { nextLesson, trackState } from "./tutorial.ts";

/** A mortarboard, 7×7. */
export const CAP = ["...#...", ".#####.", "#######", ".#####.", "..###.#", "..###.#", "......#"];

/** The button that opens the LESSON MAP. */
export function TutorialButton({ open, id = "tutorial" }: { open: () => void; id?: string }) {
  return (
    <button type="button" id={id} className="tb-lessons tb-tut-btn" onClick={open}>
      <Glyph rows={CAP} /> TUTORIAL
    </button>
  );
}

/** Herr Bach's question; YES skips the tutorial, NO starts it. */
export function PlayedBefore({ answer }: { answer: (playedBefore: boolean) => void }) {
  return (
    <div className="tb-platform tb-asked" role="dialog" aria-label="Have you played before?">
      <div className="tb-asked-bach">
        <Portrait talking={false} />
        <div className="tb-bach-box">
          <p className="tb-bach-title">HERR BACH</p>
          <p className="tb-bach-line">Guten Tag. Have you played my fugues here before?</p>
        </div>
      </div>
      <p className="tb-platform-q">HAVE YOU PLAYED BEFORE?</p>
      <div className="tb-platform-choices">
        <button type="button" id="played-yes" onClick={() => answer(true)}>
          YES
          <small>SKIP</small>
        </button>
        <button type="button" id="played-no" onClick={() => answer(false)}>
          NO
          <small>TEACH ME</small>
        </button>
      </div>
    </div>
  );
}

const PLATFORMS: [Platform, string][] = [
  ["computer", "COMPUTER"],
  ["mobile", "MOBILE"],
];

/** The LESSON MAP: a tab per platform; the lessons grouped by the mode they teach (`focus` first in view). */
export function LessonMap({ platform, focus, play, close }: { platform: Platform; focus?: ProtoId; play: (pl: Platform, n: number) => void; close: () => void }) {
  const [tab, setTab] = useState<Platform>(platform);
  const track = TRACKS[tab];
  const st = trackState(tab);
  const next = nextLesson(tab);
  const modes = [...new Set(track.map((l) => l.mode))];
  useEffect(() => {
    const keys = (e: KeyboardEvent) => e.code === "Escape" && close();
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [close]);
  useEffect(() => {
    if (focus) document.getElementById(`map-mode-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus, tab]);
  const done = track.filter((l) => st.passed[l.id]).length;
  return (
    <div className="tg-picker tb-ach tb-map" role="dialog" aria-label="Lesson map">
      <header>
        <h1>
          <Glyph rows={CAP} className="tb-ach-trophy" /> LESSONS WITH HERR BACH
        </h1>
        <button type="button" id="map-close" className="tg-x" aria-label="Close" onClick={close}>
          ✕
        </button>
      </header>
      <nav className="tg-tabs" role="tablist">
        {PLATFORMS.map(([pl, name]) => (
          <button key={pl} type="button" role="tab" id={`map-tab-${pl}`} className={pl === tab ? "on" : ""} aria-selected={pl === tab} onClick={() => setTab(pl)}>
            {name} {TRACKS[pl].filter((l) => trackState(pl).passed[l.id]).length}/{TRACKS[pl].length}
          </button>
        ))}
      </nav>
      <p className="tb-ach-note">
        {done === track.length ? "All passed. Any lesson can be played again." : `${done} of ${track.length} passed. Any lesson can be played; the next is marked.`}
      </p>
      <div className="tb-ach-list" role="tabpanel">
        {modes.map((m) => (
          <section key={m} id={`map-mode-${m}`} className={m === focus ? "tb-map-focus" : ""}>
            <h2>{protoById(m).name}</h2>
            {track.map((l, n) =>
              l.mode !== m ? null : (
                <button key={l.id} type="button" id={`map-${tab}-${l.id}`} className={`tb-ach-row tb-map-row${st.passed[l.id] ? " earned" : ""}${n === next && !st.passed[l.id] ? " next" : ""}`} onClick={() => play(tab, n)} data-lesson={l.id}>
                  <span className="tb-map-n">{st.passed[l.id] ? "✓" : n + 1}</span>
                  <span className="tb-ach-text">
                    <b>{l.english}</b>
                    <small>{l.title}</small>
                  </span>
                  <span className="tb-map-state">{st.passed[l.id] ? `${Math.round(100 * st.passed[l.id].best)}%` : n === next ? "▶ NEXT" : ""}</span>
                </button>
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
