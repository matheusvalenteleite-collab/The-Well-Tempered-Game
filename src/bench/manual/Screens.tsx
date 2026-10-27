/**
 * D342, THE MANUAL's Part 0 screens and its lens sheet: 0.1 HALTUNG (the grip and the ears: a thumb on
 * each bar, each sounding the lesson's instrument, and the sound's delay tapped); 0.2 PROBESPIEL (HAVE YOU
 * PLAYED BEFORE?: NO, I PLAY ANOTHER INSTRUMENT, I PLAY A KEYBOARD; the placement offered to the last
 * two, and skippable); the placement's results; and, after a lesson's take, its lens: COUNTS with the
 * figures reached (✓ or ✗), SHOWN with its figures, NEVER.
 */
import { useState } from "react";
import { tr } from "../../i18n/index.ts";
import type { Chip } from "../../touch/chip.ts";
import { Tapper } from "../../touch/Panels.tsx";
import { Portrait } from "../Bach.tsx";
import type { LensStats } from "./lens.ts";
import type { Check, ManualLesson } from "./lessons.ts";
import { PLACEMENT, type Placement, type PlacementTake } from "./placement.ts";
import type { Answer } from "./store.ts";

const fill = (c: Check) => tr(c.text, c.vars);

/** After a take: what counted (with ✓ or ✗), what was shown, what is never judged. */
export function LensSheet({ l, x, kind }: { l: ManualLesson; x: LensStats; kind: "drill" | "play" }) {
  const counts = l.checks?.(x) ?? [];
  const shown = l.shown?.(x) ?? [];
  return (
    <div className="tb-lens" id="lens-sheet" onClick={(e) => e.stopPropagation()}>
      {counts.length > 0 && (
        <ul className="tb-lens-counts">
          {counts.map((c) => (
            <li key={c.text} className={c.na && kind === "drill" ? "na" : c.ok ? "ok" : "no"}>
              <span aria-hidden="true">{c.na && kind === "drill" ? "·" : c.ok ? "✓" : "✗"}</span> {fill(c)}
            </li>
          ))}
        </ul>
      )}
      {!counts.length && <p className="tb-lens-shown">{tr("NOT JUDGED: PLAYED THROUGH IS PASSED")}</p>}
      {shown.length > 0 && <p className="tb-lens-shown">{shown.map(fill).join(" · ")}</p>}
      <p className="tb-lens-never">
        {tr("NEVER")}: {l.lens.never.map((c) => tr(c)).join(" · ")}
      </p>
    </div>
  );
}

function Frame({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label={title} onClick={close}>
      <div className="tg-card tb-hear tb-manual-screen" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-hear-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Says({ text }: { text: string }) {
  return (
    <div className="tb-manual-says">
      <Portrait talking={false} />
      <p>{tr(text)}</p>
    </div>
  );
}

/** 0.1, HALTUNG: both bars, a thumb resting on each (each touch sounds the lesson's instrument); the sound's delay tapped. */
export function GripScreen({ chip, sound, lag, setLag, done, close }: { chip: () => Chip; sound: (side: "left" | "right") => void; lag: number | null; setLag: (l: number | null) => void; done: () => void; close: () => void }) {
  const [tapping, setTapping] = useState(false);
  const [touched, setTouched] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touch = (side: "left" | "right") => (sound(side), setTouched((t) => ({ ...t, [side]: true })));
  return (
    <Frame title={`0.1 · HALTUNG · ${tr("THE GRIP AND THE EARS")}`} close={close}>
      <Says text="Two thumbs and one voice. The rest of the music is mine to play." />
      <p className="tb-manual-aim">{tr("Phone sideways, one thumb on each bar, the sound in time with the touch.")}</p>
      <div className="tb-grip">
        {(["left", "right"] as const).map((side) => (
          <button key={side} type="button" id={`grip-${side}`} className={`tb-grip-bar${touched[side] ? " on" : ""}`} onPointerDown={(e) => (e.preventDefault(), touch(side))}>
            <span className="tb-grip-thumb" aria-hidden="true" />
            {tr(side === "left" ? "LEFT THUMB" : "RIGHT THUMB")}
          </button>
        ))}
        <div className="tb-grip-box" aria-hidden="true">
          <span>{tr("THE MUSIC")}</span>
        </div>
      </div>
      {tapping ? (
        <div className="tb-grip-tap">
          <p className="tg-panel-note">{tr("With headphones on, tap along to the clicks so the music and your taps line up.")}</p>
          <Tapper chip={chip} done={(l) => (l !== null && setLag(l), setTapping(false))} />
        </div>
      ) : (
        <p className="tb-lens-shown" id="grip-delay">
          {tr("SOUND DELAY")}: {lag === null ? tr("NONE (THE PHONE'S SPEAKER)") : `${Math.round(lag * 1000)} MS`} ·{" "}
          <button type="button" id="grip-tap" className="tg-link" onClick={() => setTapping(true)}>
            {tr("TAP THE DELAY (HEADPHONES)")}
          </button>
        </p>
      )}
      <div className="tb-manual-go">
        <button type="button" id="grip-done" className="tb-play" onClick={done}>
          ▶ {tr("READY")}
        </button>
      </div>
    </Frame>
  );
}

/** 0.2, PROBESPIEL: the question, then (another instrument, a keyboard) the placement offered. */
export function AskScreen({ answer, close }: { answer: (a: Answer, test: boolean | null) => void; close: () => void }) {
  const [a, setA] = useState<Answer | null>(null);
  return (
    <Frame title={`0.2 · PROBESPIEL · ${tr("HAVE YOU PLAYED BEFORE?")}`} close={close}>
      <Says text={a ? "Then play me four short passages, one take each. About four minutes." : "Have you played before?"} />
      {!a ? (
        <div className="tb-manual-answers">
          <button type="button" id="ask-no" className="tb-play" onClick={() => answer("no", null)}>
            {tr("NO")}
            <small>{tr("START AT LESSON I.1")}</small>
          </button>
          <button type="button" id="ask-other" className="tb-play" onClick={() => setA("other")}>
            {tr("I PLAY ANOTHER INSTRUMENT")}
          </button>
          <button type="button" id="ask-keyboard" className="tb-play" onClick={() => setA("keyboard")}>
            {tr("I PLAY A KEYBOARD")}
          </button>
        </div>
      ) : (
        <div className="tb-manual-answers">
          <button type="button" id="ask-test" className="tb-play" onClick={() => answer(a, true)}>
            ▶ {tr("THE PLACEMENT · 4 PASSAGES")}
          </button>
          <button type="button" id="ask-skip" className="tb-manual-skip" onClick={() => answer(a, false)}>
            {tr("SKIP IT: OPEN EVERY PART")}
          </button>
          <ol className="tb-manual-material">
            {PLACEMENT.map((e) => (
              <li key={e.id}>
                {tr(e.m.label)} <small>· {tr(e.tests)}</small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Frame>
  );
}

/** The placement's results: Herr Bach's recommendation and what each passage showed; once more on the worst, if wanted. */
export function PlacementScreen({ p, takes, retake, onRetake, done, close }: { p: Placement; takes: PlacementTake[]; retake: string | null; onRetake: () => void; done: () => void; close: () => void }) {
  return (
    <Frame title={`0.2 · PROBESPIEL · ${tr("THE PLACEMENT")}`} close={close}>
      <Says text={tr(p.line.text, p.line.vars)} />
      <ol className="tb-manual-material" id="placement-results">
        {PLACEMENT.map((e, k) => {
          const t = [...takes].reverse().find((x) => x.id === e.id);
          const s = t ? e.showed(t.x) : null;
          return (
            <li key={e.id} className={p.results[k].ok ? "ok" : "no"}>
              <span aria-hidden="true">{p.results[k].ok ? "✓" : "·"}</span> {tr(e.m.label)}
              {s && <small> · {tr(s.text, s.vars)}</small>}
            </li>
          );
        })}
      </ol>
      <div className="tb-manual-go">
        <button type="button" id="placement-done" className="tb-play" onClick={done}>
          ▶ {p.start ? tr("BEGIN WITH {l}", { l: p.start }) : tr("THE MANUAL")}
        </button>
        {retake && (
          <button type="button" id="placement-retake" className="tb-manual-skip" onClick={onRetake}>
            {tr("ONCE MORE: {l}", { l: tr(PLACEMENT.find((e) => e.id === retake)!.m.label) })}
          </button>
        )}
      </div>
    </Frame>
  );
}
