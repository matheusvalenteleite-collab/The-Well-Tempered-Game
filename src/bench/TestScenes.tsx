/**
 * D1069, TEST SCENES in play.html's developer view (SETTINGS, unlocked): a fold listing test-scenes.ts's scenes, each one tap
 * (BenchApp runScene: the piece, the sound, the voice, the mechanics, an unscored looped run of its bars). Left in English.
 */
import { useState } from "react";
import { TEST_SCENES, type TestScene } from "./test-scenes.ts";

export function TestScenes({ run, ready }: { run: (s: TestScene) => void; ready?: string | null }) {
  const [open, setOpen] = useState(!!ready);
  return (
    <section className="tb-scenes" id="test-scenes" aria-label="Test scenes">
      <button type="button" id="test-scenes-fold" className="tb-scenes-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "-" : "+"} TEST SCENES
      </button>
      {open && (
        <ul className="tb-scenes-list">
          {TEST_SCENES.map((s) => (
            <li key={s.id}>
              <button type="button" id={`scene-${s.id}`} className={`tb-scene${ready === s.id ? " ready" : ""}`} onClick={() => run(s)}>
                <span className="tb-scene-name">
                  {s.name} · BARS {s.fromBar}–{s.toBar}
                  {s.tempo < 100 ? ` · ${s.tempo}%` : ""}
                  {ready === s.id ? " · SWITCHED ON: TAP AGAIN" : ""}
                </span>
                <span className="tb-scene-line">{s.line}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
