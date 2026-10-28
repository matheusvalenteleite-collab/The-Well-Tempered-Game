/**
 * D342, THE MANUAL's map (design 4.8; replaces TutorialSteps.tsx on play.html): the parts as chapters,
 * their lessons inside, numbered, the next one marked; a lesson opened shows its card (aim, the lens:
 * COUNTS, SHOWN, NEVER; the material with its badges; SOURCES) and BEGIN. Every lesson of an open part
 * is open. A locked part is held down (a long press) to offer ICH KANN DAS SCHON: its checkpoint played
 * once. The parts of later phases are listed, to come.
 */
import { useRef, useState } from "react";
import { tr } from "../../i18n/index.ts";
import { checkpointOf, lessonMeta, lessonsOf, MANUAL, PARTS, type ManualLesson, type PartId } from "./lessons.ts";
import { Seal } from "./Screens.tsx";
import { lessonDone, nextLesson, partOpen, progress, readManual, type ManualStore } from "./store.ts";

/** A long press (ms). */
const HOLD_MS = 550;

export function ManualMap({ begin, testOut, close, store }: { begin: (id: string, o?: { skip?: boolean }) => void; testOut: (p: PartId) => void; close: () => void; store?: ManualStore }) {
  const s = store ?? readManual();
  const next = nextLesson(s);
  const [open, setOpen] = useState<string | null>(null);
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
                  <LessonRow key={l.id} l={l} s={s} open={isOpen} next={next === l.id} shown={open === l.id} toggle={() => setOpen(open === l.id ? null : l.id)} begin={begin} />
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
    </div>
  );
}

function LessonRow({ l, s, open, next, shown, toggle, begin }: { l: ManualLesson; s: ManualStore; open: boolean; next: boolean; shown: boolean; toggle: () => void; begin: (id: string, o?: { skip?: boolean }) => void }) {
  const rec = s.lessons[l.id];
  const done = lessonDone(s, l.id);
  const mark = rec?.passed ? "✓" : rec?.tested ? tr("TESTED") : rec?.later ? "↷" : open ? "▶" : "🔒";
  return (
    <li>
      <button type="button" id={`lesson-${l.id}`} data-lesson={l.id} className={`tb-step${done ? " done" : ""}${next && !done ? " next" : ""}`} disabled={!open} onClick={toggle} aria-expanded={shown}>
        <span className="tb-step-n">{l.id}</span>
        <span className="tb-step-name">
          {tr(l.english)}
          <small>
            {l.title} · {lessonMeta(l)}
          </small>
        </span>
        <span className="tb-step-mark">{mark}</span>
      </button>
      {shown && open && (
        <div className="tb-manual-card" id={`card-${l.id}`}>
          <p className="tb-manual-aim">{tr(l.aim)}</p>
          {!l.screen && (
          <dl className="tb-manual-lens">
            <dt>{tr("COUNTS")}</dt>
            <dd>{l.lens.counts.map((c) => tr(c)).join(" · ")}</dd>
            <dt>{tr("SHOWN")}</dt>
            <dd>{l.lens.shown.map((c) => tr(c)).join(" · ")}</dd>
            <dt>{tr("NEVER")}</dt>
            <dd>{l.lens.never.map((c) => tr(c)).join(" · ")}</dd>
          </dl>
          )}
          {l.stages.length > 0 && (
            <ul className="tb-manual-material">
              {l.stages.map((st, k) => (
                <li key={k}>
                  <span className={`tb-manual-badge ${st.m.badge === "DRILL" ? "drill" : "game"}`}>{st.kind === "play" ? tr("PLAY") : st.m.badge === "DRILL" ? tr("DRILL") : tr("PRACTICE")}</span> {tr(st.m.label)}
                </li>
              ))}
            </ul>
          )}
          {l.sources?.length ? (
            <details className="tb-manual-sources">
              <summary>{tr("SOURCES")}</summary>
              {l.sources.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </details>
          ) : null}
          <div className="tb-manual-go">
            <button type="button" id={`begin-${l.id}`} className="tb-play" onClick={() => begin(l.id)}>
              ▶ {tr("BEGIN")}
            </button>
            {rec?.seen && l.stages.length > 1 && (
              <button type="button" id={`skip-${l.id}`} className="tb-manual-skip" onClick={() => begin(l.id, { skip: true })}>
                {tr("STRAIGHT TO PLAY")}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** The number of lessons built (Parts I–IV: the list's card). */
export const MANUAL_SIZE = MANUAL.filter((l) => !l.screen).length;
