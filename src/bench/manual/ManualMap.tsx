/**
 * D373, THE TUTORIAL's own selection screen (Luigi and Mario's tut-select; replaces D342's map, whose long
 * scrolling list the owner found "misaligned … too much scrolling"): the play screen's three columns, so
 * the hands already know them, and nothing scrolls. Left: TUTORIAL WITH HERR BACH and the parts as tabs,
 * each with a square a lesson (green: passed). Centre: the part's lessons as tiles: number, title, its
 * music, the shape of its tune drawn small, and its steps as chips (WATCH · TRY · PLAY; a finished one, or
 * the one it stopped at, taken up at a tap: D369's WHERE TO BEGIN? now on the tile itself); NEXT on the
 * one suggested. Right: the chosen lesson: "You'll learn: …", its music, sound and length, where it
 * stopped, and CONTINUE under the right thumb (or START OVER).
 */
import { useState } from "react";
import { lang, LANGS, setLang, tr, type Lang } from "../../i18n/index.ts";
import { fugueById } from "../../touch/fugue.ts";
import { Portrait } from "../Bach.tsx";
import { bpmOf, BUILT, isCourse, lessonById, lessonsOf, midiOf, shownId, SOUND_WORD, soundOf, spanOf, STEP_WORD, type ManualLesson, type PartId } from "./lessons.ts";
import { lessonDone, nextLesson, readManual, resumeAt, stepsDone, type ManualStore } from "./store.ts";

/** The tune's shape, small (its first notes, from the lesson's own list or the data). */
function contourOf(l: ManualLesson): number[] {
  const m = l.stages.at(-1)?.m ?? l.stages[0]?.m;
  if (!m) return [];
  if (m.notes) return m.notes.slice(0, 16).map(midiOf);
  const f = fugueById(m.piece);
  if (f.id !== m.piece) return [];
  const { from, until } = spanOf(m);
  return f.voices[m.voice]
    .filter((n) => n[0] >= from && n[0] < until)
    .slice(0, 16)
    .map((n) => n[2]);
}

function Contour({ l }: { l: ManualLesson }) {
  const ns = contourOf(l);
  if (!ns.length) return <span className="tb-tut-contour" />;
  const lo = Math.min(...ns);
  const hi = Math.max(...ns, lo + 6);
  const W = 100;
  const H = 30;
  const bw = W / Math.max(8, ns.length);
  return (
    <svg className="tb-tut-contour" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet" aria-hidden="true">
      {ns.map((m, k) => (
        <rect key={k} x={k * bw} y={H - 4 - ((m - lo) / (hi - lo)) * (H - 6)} width={bw * 0.8} height={3} fill="#5aa2ee" />
      ))}
    </svg>
  );
}

const partOf = (id: PartId) => BUILT.find((p) => p.id === id)!;
/** D379: a part's name on its tab and bar: PART 4, or the fugue track's own. */
const partWord = (p: (typeof BUILT)[number]) => (p.track ? tr("THE FUGUE TRACK") : tr("PART {n}", { n: p.n ?? p.id }));
/** D379: the lesson has takes of the player's (the metronome on), or only his playing, questions and taps. */
const hasTakes = (l: ManualLesson) => l.stages.some((s) => s.kind === "play" || s.kind === "try");
const minutesWord = (l: ManualLesson) => tr("ABOUT {n} MINUTES", { n: l.minutes });
const musicOf = (l: ManualLesson) => (l.music ? tr(l.music) : tr(l.stages.at(-1)?.m.label ?? ""));

export function TutorialSelect({ begin, close, focus, store, relang }: { begin: (id: string, o?: { stage?: number }) => void; close: () => void; focus?: string | null; store?: ManualStore; relang?: () => void }) {
  const s = store ?? readManual();
  const next = nextLesson(s);
  const first = lessonById(focus ?? next ?? "1.1") ?? lessonById("1.1")!;
  const [chosen, setChosen] = useState<string>(first.id);
  const [part, setPart] = useState<PartId>(first.part);
  const l = lessonById(chosen) ?? first;
  const lessons = lessonsOf(part);
  const at = resumeAt(s, l.id);
  const begun = (s.lessons[l.id]?.steps?.length ?? 0) > 0 || (s.lessons[l.id]?.reached ?? 0) > 0;
  const done = lessonDone(s, l.id);
  const [, redraw] = useState(0);
  return (
    <div className="tb-tut" role="dialog" aria-label={tr("TUTORIAL")} id="tutorial-select">
      <aside className="tb-tut-left">
        <header className="tb-tut-head">
          <Portrait talking={false} />
          <div>
            <h2>{tr("TUTORIAL")}</h2>
            <p>{tr("WITH HERR BACH")}</p>
          </div>
        </header>
        <nav className="tb-tut-parts">
          {BUILT.map((p) => {
            const ls = lessonsOf(p.id);
            return (
              <button key={p.id} type="button" id={`tut-part-${p.id}`} className={`tb-tut-part${p.id === part ? " on" : ""}${p.phase === "B" ? " older" : ""}${p.track ? " track" : ""}`} onClick={() => (setPart(p.id), setChosen((ls.find((x) => x.id === next) ?? ls.find((x) => !lessonDone(s, x.id)) ?? ls[0]).id))}>
                <span className="tb-tut-part-n">{partWord(p)}</span>
                <span className="tb-tut-part-name">{tr(p.english)}</span>
                <span className="tb-tut-pips">
                  {ls.map((x) => (
                    <i key={x.id} className={lessonDone(s, x.id) ? "done" : ""} />
                  ))}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="tb-tut-centre">
        <p className="tb-tut-bar">
          {partWord(partOf(part))} · {tr(partOf(part).english)}
          {partOf(part).sub ? ` · ${tr(partOf(part).sub!)}` : ""}
        </p>
        <div className={`tb-tut-tiles n${lessons.length}`}>
          {lessons.map((x) => {
            const steps = stepsDone(s, x.id);
            const here = resumeAt(s, x.id);
            return (
              <div key={x.id} id={`tile-${x.id}`} data-lesson={x.id} role="button" tabIndex={0} className={`tb-tut-tile${x.id === l.id ? " on" : ""}${lessonDone(s, x.id) ? " done" : ""}`} onClick={() => setChosen(x.id)} onKeyDown={(e) => e.key === "Enter" && setChosen(x.id)}>
                <span className="tb-tut-tile-n">{shownId(x.id)}</span>
                {lessonDone(s, x.id) ? <span className="tb-tut-tick">✓</span> : x.id === next ? <span className="tb-tut-next">{tr("NEXT")}</span> : null}
                <span className="tb-tut-tile-name">{tr(x.english)}</span>
                <span className="tb-tut-tile-music">{musicOf(x)}</span>
                <Contour l={x} />
                <span className="tb-tut-chips">
                  {x.stages.map((st, k) => {
                    const fin = steps.includes(k);
                    const open = fin || k <= here;
                    return (
                      <button key={k} type="button" id={`chip-${x.id}-${k}`} className={`tb-tut-chip ${st.kind}${fin ? " fin" : ""}`} disabled={!open} onClick={(e) => (e.stopPropagation(), begin(x.id, { stage: k }))}>
                        {tr(STEP_WORD[st.kind])}
                      </button>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </main>
      <aside className="tb-tut-right">
        <button type="button" className="tg-x tb-tut-x" id="tutorial-close" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h3 className="tb-tut-title">
          {shownId(l.id)} · {tr(l.english)}
        </h3>
        <p className="tb-tut-learn">{tr("You'll learn: {l}", { l: tr(l.learn ?? l.aim) })}</p>
        <dl className="tb-tut-facts">
          <dt>{tr("MUSIC")}</dt>
          <dd>{musicOf(l)}</dd>
          <dt>{tr("SOUND")}</dt>
          <dd>
            {tr(SOUND_WORD[soundOf(l, l.stages.at(-1)?.m)])}
            {hasTakes(l) ? ` · ${tr("METRONOME ON")}` : ""}
          </dd>
          <dt>{tr("TIME")}</dt>
          <dd>
            {minutesWord(l)}
            {isCourse(l) && hasTakes(l) && l.stages.at(-1) ? ` · ♩ = ${Math.round(bpmOf(l.stages.at(-1)!.m))}` : ""}
          </dd>
        </dl>
        {begun && !done && <p className="tb-tut-stopped">{tr("YOU STOPPED AT: {s}", { s: tr(STEP_WORD[l.stages[at]?.kind ?? "play"]) })}</p>}
        <div className="tb-tut-go">
          <button type="button" id="tutorial-continue" className="tb-play tb-tut-continue" autoFocus onClick={() => begin(l.id, at ? { stage: at } : undefined)}>
            ▶ {tr(done ? "AGAIN" : begun ? "CONTINUE" : "BEGIN")}
          </button>
          {begun && !done && at > 0 && (
            <button type="button" id="tutorial-over" className="tg-link tb-tut-over" onClick={() => begin(l.id)}>
              {tr("or START OVER")}
            </button>
          )}
        </div>
        <div className="tb-tut-langs" role="group" aria-label="Language">
          {LANGS.map(([code]) => (
            <button key={code} type="button" id={`tut-lang-${code}`} className={code === lang() ? "on" : ""} onClick={() => (setLang(code as Lang), relang?.(), redraw((n) => n + 1))}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/** The number of lessons built (the home's tile). */
export const MANUAL_SIZE = BUILT.reduce((a, p) => a + lessonsOf(p.id).length, 0);
