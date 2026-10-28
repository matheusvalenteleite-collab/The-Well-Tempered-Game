/**
 * D342, THE MANUAL's map (design 4.8; replaces TutorialSteps.tsx on play.html): the parts as chapters,
 * their lessons inside, numbered, the next one marked. D369 (the owner: the info box "is cluttered … clicking
 * on the lesson … should already take one to the lesson"): a lesson tapped begins at once; one already
 * taken past its first stage asks first where to begin (WHERE TO BEGIN?: from the beginning, or any stage
 * reached; where it was left marked and focused). Every lesson of an open part is open. A locked part is held down (a long press) to offer ICH KANN DAS SCHON: its checkpoint played
 * once. The parts of later phases are listed, to come.
 */
import { useRef, useState } from "react";
import { tr } from "../../i18n/index.ts";
import { checkpointOf, lessonMeta, lessonsOf, MANUAL, PARTS, type ManualLesson, type PartId } from "./lessons.ts";
import { Seal } from "./Screens.tsx";
import { lessonDone, nextLesson, partOpen, progress, reachedOf, readManual, type ManualStore } from "./store.ts";

/** A long press (ms). */
const HOLD_MS = 550;

export function ManualMap({ begin, testOut, close, store }: { begin: (id: string, o?: { stage?: number }) => void; testOut: (p: PartId) => void; close: () => void; store?: ManualStore }) {
  const s = store ?? readManual();
  const next = nextLesson(s);
  // D369: the lesson whose WHERE TO BEGIN? is up (a stage past its first already reached).
  const [asking, setAsking] = useState<string | null>(null);
  const choose = (l: ManualLesson) => (!l.screen && l.stages.length > 1 && reachedOf(s, l.id) > 0 ? setAsking(l.id) : begin(l.id));
  const askingL = asking ? MANUAL.find((l) => l.id === asking) : undefined;
  const [offer, setOffer] = useState<PartId | null>(null);
  const timer = useRef(0);
  const pr = progress(s);
  const holdStart = (p: PartId) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOffer(p), HOLD_MS);
  };
  const holdEnd = () => window.clearTimeout(timer.current);
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="The manual" onClick={close}>
      <div className="tg-card tb-hear tb-steps tb-manual" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-hear-title">{tr("THE MANUAL · WITH HERR BACH")}</h2>
        <p className="tb-manual-sub">{tr("{n} OF {m} LESSONS", { n: pr.done, m: pr.of })}</p>
        {PARTS.filter((p) => p.phase !== "later").map((p) => {
          const isOpen = partOpen(s, p.id);
          const state = s.parts[p.id];
          return (
            <section key={p.id} className={`tb-manual-part${isOpen ? "" : " locked"}`} id={`part-${p.id}`}>
              <h3
                className="tb-manual-part-head"
                onPointerDown={() => !isOpen && holdStart(p.id)}
                onPointerUp={holdEnd}
                onPointerLeave={holdEnd}
                onContextMenu={(e) => (e.preventDefault(), !isOpen && setOffer(p.id))}
              >
                <span className="tb-manual-part-n">{p.id === "0" ? "0" : p.id}</span>
                <span className="tb-manual-part-name">
                  {p.title}
                  <small>{tr(p.english)}</small>
                </span>
                <span className="tb-manual-part-mark">{state === "passed" ? <Seal part={p.id} small /> : state === "tested" ? tr("TESTED") : isOpen ? "" : "🔒"}</span>
              </h3>
              {!isOpen && offer !== p.id && <p className="tb-manual-hint">{tr("LOCKED · HOLD TO TEST OUT")}</p>}
              {!isOpen && offer === p.id && checkpointOf(p.id) && (
                <button type="button" id={`testout-${p.id}`} className="tb-manual-testout" onClick={() => testOut(p.id)}>
                  {tr("ICH KANN DAS SCHON · I CAN ALREADY DO THIS")}
                  <small>{tr("Play the checkpoint once: {l}", { l: tr(checkpointOf(p.id)!.english) })}</small>
                </button>
              )}
              <ol className="tb-steps-list">
                {lessonsOf(p.id).map((l) => (
                  <LessonRow key={l.id} l={l} s={s} open={isOpen} next={next === l.id} choose={() => choose(l)} />
                ))}
              </ol>
            </section>
          );
        })}
        <section className="tb-manual-part later">
          <h3 className="tb-manual-part-head">
            <span className="tb-manual-part-n">VI–VIII</span>
            <span className="tb-manual-part-name">
              {tr("IN A LATER VERSION")}
              <small>{PARTS.filter((p) => p.phase === "later").map((p) => tr(p.english)).join(" · ")}</small>
            </span>
          </h3>
        </section>
        <p className="tb-manual-sub">{tr("The game itself is never locked: every piece is open.")}</p>
      </div>
      {askingL && <WhereToBegin l={askingL} reached={Math.min(reachedOf(s, askingL.id), askingL.stages.length - 1)} begin={begin} close={() => setAsking(null)} />}
    </div>
  );
}

/**
 * D369: WHERE TO BEGIN? A lesson left midway (the owner: "I have to restart from beginning. BAD"): from
 * the beginning (his lines and demonstration), or straight to any stage already reached; where it was left
 * is marked and has the focus (the default).
 */
export function WhereToBegin({ l, reached, begin, close }: { l: ManualLesson; reached: number; begin: (id: string, o?: { stage?: number }) => void; close: () => void }) {
  return (
    <div className="tb-pop-veil tb-resume-veil" role="dialog" aria-label={tr("WHERE TO BEGIN?")} onClick={(e) => (e.stopPropagation(), close())}>
      <div className="tb-pop tb-resume" id="resume-pop" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-resume-title">
          {l.id} · {tr(l.english)}
        </h2>
        <p className="tb-resume-q">{tr("WHERE TO BEGIN?")}</p>
        <ol className="tb-resume-list">
          {l.stages.slice(0, reached + 1).map((st, k) => (
            <li key={k}>
              <button type="button" id={`resume-${k}`} className={`tb-resume-stage${k === reached ? " here" : ""}`} autoFocus={k === reached} onClick={() => (close(), begin(l.id, k ? { stage: k } : undefined))}>
                <span className="tb-resume-n">{k + 1}</span>
                <span className="tb-resume-name">
                  {k === 0 ? tr("FROM THE BEGINNING") : `${st.kind === "play" ? tr("PLAY") : st.m.badge === "DRILL" ? tr("DRILL") : tr("PRACTICE")}`}
                  <small>{tr(st.m.label)}</small>
                </span>
                {k === reached && <span className="tb-resume-here">{tr("WHERE YOU LEFT OFF")}</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function LessonRow({ l, s, open, next, choose }: { l: ManualLesson; s: ManualStore; open: boolean; next: boolean; choose: () => void }) {
  const rec = s.lessons[l.id];
  const done = lessonDone(s, l.id);
  const mark = rec?.passed ? "✓" : rec?.tested ? tr("TESTED") : rec?.later ? "↷" : open ? "▶" : "🔒";
  return (
    <li>
      <button type="button" id={`lesson-${l.id}`} data-lesson={l.id} className={`tb-step${done ? " done" : ""}${next && !done ? " next" : ""}`} disabled={!open} onClick={choose}>
        <span className="tb-step-n">{l.id}</span>
        <span className="tb-step-name">
          {tr(l.english)}
          <small>
            {l.title} · {lessonMeta(l)}
          </small>
        </span>
        <span className="tb-step-mark">{mark}</span>
      </button>
    </li>
  );
}

/** The number of lessons built (Parts I–IV: the list's card). */
export const MANUAL_SIZE = MANUAL.filter((l) => !l.screen).length;
