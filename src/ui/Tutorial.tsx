/**
 * The tutorial (D140): a screen of its own, opened by TUTORIAL in the top bar. Chapters of short
 * lessons, from reading a note to three voices; each lesson is a page of text and one task (listen,
 * answer, write), and Next opens once the task is done. The game stays where it was underneath.
 * Progress (lessons done, the lesson reached) is remembered in this browser.
 */
import { useEffect, useMemo, useState } from "react";
import data from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { repository } from "../music/fux/load-browser.ts";
import { TRIO_SPECIES, trioSteps } from "../game/trio.ts";
import { buildCourse, lessonsOf } from "../tutorial/course.ts";
import { judge, sceneEvents, type Lesson, type Scene } from "../tutorial/model.ts";
import { chapterText, lessonText, tt } from "../tutorial/text.ts";
import { audio, store, stored } from "./shared.ts";
import { restoreSound } from "../audio/sound.ts";
import { InfoBar } from "./InfoBar.tsx";
import { BetaToggle } from "./BetaToggle.tsx";
import { useBeta } from "./beta.ts";
import { openInOrder as lessonOpen } from "../game/unlock.ts";
import { ClipButtons, FugueRoll, Inline, Prose, Quiz, RoadMap, SceneScore, TrioPane, usePlayer, WriteScene } from "./TutorialParts.tsx";

const TRIO = trioSteps(data as never);
/** Every three-voice exercise, species by species (the road map). */
const TRIO_ALL = TRIO_SPECIES.map((n) => ({ species: n, ids: trioSteps(data as never, n).map((s) => s.id) }));
const CHAPTERS = buildCourse({ repo: repository, trio: TRIO, trioData: data });
const LESSONS = lessonsOf(CHAPTERS);

interface Progress {
  at: string;
  done: string[];
}
const KEY = "wtg.tutorial";
const validProgress = (v: unknown) => typeof v === "object" && v !== null && typeof (v as Progress).at === "string" && Array.isArray((v as Progress).done);

/** Has this browser ever opened the tutorial? (The first-visit invitation reads it.) */
export const tutorialSeen = () => stored<Progress | null>(KEY, null, validProgress) !== null;

export function Tutorial(p: { onLeave(): void; onGame(voices: 2 | 3 | "wtc", stepId?: string): void; onTour(): void }) {
  const [progress, setProgress] = useState<Progress>(() => {
    const v = stored<Progress>(KEY, { at: LESSONS[0].lesson.id, done: [] }, validProgress);
    return LESSONS.some((x) => x.lesson.id === v.at) ? v : { ...v, at: LESSONS[0].lesson.id };
  });
  useEffect(() => store(KEY, progress), [progress]);
  const index = LESSONS.findIndex((x) => x.lesson.id === progress.at);
  const { chapter, lesson } = LESSONS[index];
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === chapter);
  const [contents, setContents] = useState(false);
  const beta = useBeta();
  const IDS = LESSONS.map((x) => x.lesson.id);
  /** Lesson k may be opened from the contents (always in BETA; in the real setup, in order). */
  const isOpen = (k: number) => lessonOpen(IDS, progress.done, k, beta);

  // A clean sound for the lessons: the default voices, every channel open. The game puts its own back.
  useEffect(() => {
    audio.setSoundState(restoreSound(null));
    audio.setGates({});
    audio.drums = false;
    return () => audio.stop();
  }, []);


  const go = (k: number) => {
    if (k < 0 || k >= LESSONS.length) return;
    setProgress((x) => ({ ...x, at: LESSONS[k].lesson.id }));
    setContents(false);
  };
  /** Tick a lesson (once its task is done). */
  const markDone = (id: string) => {
    if (progress.done.includes(id)) return;
    // Stored at once: the tour closes the tutorial in the same moment, before an effect could run.
    const next = { ...progress, done: [...progress.done, id] };
    store(KEY, next);
    setProgress(next);
  };

  return (
    <div className="shell tutorial">
      <header className="topbar">
        <h1 className="brand">{tt("ui.title")}</h1>
        <button className="tut-contents-btn" aria-pressed={contents} onClick={() => setContents(!contents)}>☰ {tt("ui.contents")}</button>
        <span className="tut-progress" aria-label={tt("ui.progress", { n: progress.done.length, total: LESSONS.length })}>
          <span className="bar"><span style={{ width: `${(100 * progress.done.length) / LESSONS.length}%` }} /></span>
          <span className="count">{tt("ui.progress", { n: progress.done.length, total: LESSONS.length })}</span>
        </span>
        <div className="header-tools">
          <BetaToggle />
          <button className="howto" onClick={p.onLeave}>{tt("ui.leave")}</button>
        </div>
      </header>
      <div className="shell-body tut-body">
        <nav className={contents ? "tut-toc open" : "tut-toc"} aria-label={tt("ui.contents")}>
          <ol>
            {CHAPTERS.map((c, ci) => {
              const ids = c.lessons.map((l) => l.id);
              const n = ids.filter((id) => progress.done.includes(id)).length;
              const first = LESSONS.findIndex((x) => x.chapter === c.id);
              return (
                <li key={c.id} className={c.id === chapter ? "current" : undefined}>
                  <button className="tut-chapter" disabled={!isOpen(first)} onClick={() => go(first)} title={isOpen(first) ? chapterText(c.id).blurb : tt("ui.locked")}>
                    <span className="num">{ci + 1}</span> {!isOpen(first) && "🔒 "}{chapterText(c.id).title}
                    <span className="tick">{n === ids.length ? "✓" : `${n}/${ids.length}`}</span>
                  </button>
                  {c.id === chapter && (
                    <ol className="tut-lessons">
                      {c.lessons.map((l) => {
                        const k = IDS.indexOf(l.id);
                        return (
                        <li key={l.id}>
                          <button aria-current={l.id === lesson.id} disabled={!isOpen(k)} title={isOpen(k) ? undefined : tt("ui.locked")} onClick={() => go(k)}>
                            {progress.done.includes(l.id) ? "✓ " : isOpen(k) ? "· " : "🔒 "}
                            {lessonText(l.id).title}
                          </button>
                        </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            className="link tut-forget"
            onClick={() => {
              if (window.confirm(tt("ui.resetAllConfirm"))) setProgress({ at: LESSONS[0].lesson.id, done: [] });
            }}
          >
            {tt("ui.resetAll")}
          </button>
        </nav>
        <LessonPage
          key={lesson.id}
          skip={beta}
          index={index}
          already={progress.done.includes(lesson.id)}
          onDone={() => markDone(lesson.id)}
          onGo={go}
          onLeave={p.onLeave}
          onGame={p.onGame}
          onTour={() => {
            // The tutorial closes for the tour: tick the lesson now.
            markDone(lesson.id);
            p.onTour();
          }}
        />
      </div>
      <InfoBar idle={chapterText(chapter).blurb} />
    </div>
  );
}

/**
 * One lesson's page. Keyed by the lesson, so that everything it holds (the task done, the clips
 * heard, the view toggles, what is playing) starts clean with each lesson and never leaks into the next.
 */
function LessonPage(p: { skip: boolean; index: number; already: boolean; onDone(): void; onGo(k: number): void; onLeave(): void; onGame(voices: 2 | 3 | "wtc", stepId?: string): void; onTour(): void }) {
  const { chapter, lesson } = LESSONS[p.index];
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === chapter);
  const text = lessonText(lesson.id);
  const [taskDone, setTaskDone] = useState(false);
  const [names, setNames] = useState(lesson.names ?? true);
  const [intervals, setIntervals] = useState(lesson.intervals ?? false);
  const [heard, setHeard] = useState<string[]>([]);
  const player = usePlayer();
  useEffect(() => {
    document.querySelector(".tut-main")?.scrollTo({ top: 0 });
  }, []);
  const task = lesson.task;
  const need = task.kind === "listen" ? Math.min(task.need ?? task.clips.length, task.clips.length) : 0;
  // Reading, and the invitations to the game, are done on arrival.
  const done = task.kind === "read" || task.kind === "game" || taskDone || (task.kind === "listen" && heard.filter((h) => task.clips.some((c) => c.id === h)).length >= need);
  useEffect(() => {
    if (done && !p.already) p.onDone();
  }, [done]);
  const last = p.index === LESSONS.length - 1;
  // A lesson done before may be passed again freely.
  const open = done || p.already;
  return (
    <main className="tut-main">
      <p className="tut-kicker">
        {tt("ui.chapterOf", { n: chapterIndex + 1 })} · {chapterText(chapter).title} — {tt("ui.lessonOf", { n: p.index + 1, total: LESSONS.length })}
      </p>
      <h2 className="tut-title">{p.already && <span className="tut-done-mark">{tt("ui.doneMark")} </span>}{text.title}</h2>
      <Prose paragraphs={text.text} />
      {lesson.roll && <FugueRoll fugueId={lesson.roll} clips={[...(lesson.task.kind === "listen" ? lesson.task.clips : []), ...(lesson.clips ?? [])]} player={player} />}
      {lesson.clips && <ClipButtons clips={lesson.clips} labels={text.clips} player={player} />}
      <LessonBody
        lesson={lesson}
        names={names}
        intervals={intervals}
        onNames={setNames}
        onIntervals={setIntervals}
        player={player}
        heard={heard}
        onHeard={(id) => setHeard((h) => (h.includes(id) ? h : [...h, id]))}
        onDone={setTaskDone}
        onGame={p.onGame}
        onTour={p.onTour}
      />
      {done && text.done && task.kind !== "read" && <p className="tut-say ok tut-done-text">✓ <Inline text={text.done} /></p>}
      <div className="tut-nav">
        <button onClick={() => p.onGo(p.index - 1)} disabled={p.index === 0}>{tt("ui.back")}</button>
        <span className="tool-gap" />
        {!open && p.skip && (
          <button className="link" title={tt("ui.skipHelp")} onClick={() => p.onGo(p.index + 1)} disabled={last}>
            {tt("ui.skip")}
          </button>
        )}
        {last ? (
          <button className="primary" onClick={p.onLeave}>{tt("ui.finish")}</button>
        ) : (
          <button className="primary tut-next" disabled={!open} onClick={() => p.onGo(p.index + 1)}>
            {tt("ui.next")}
          </button>
        )}
      </div>
    </main>
  );
}

/** The task of a lesson, with its scene. */
function LessonBody(p: {
  lesson: Lesson;
  names: boolean;
  intervals: boolean;
  onNames(v: boolean): void;
  onIntervals(v: boolean): void;
  player: ReturnType<typeof usePlayer>;
  heard: string[];
  onHeard(id: string): void;
  onDone(done: boolean): void;
  onGame(voices: 2 | 3 | "wtc", stepId?: string): void;
  onTour(): void;
}) {
  const { lesson, player } = p;
  const text = lessonText(lesson.id);
  const task = lesson.task;
  const [pulse, setPulse] = useState<number[] | undefined>(undefined);
  const viewToggles = (lesson.scene || lesson.trio) && (
    <span className="tut-view">
      <button className="chipbtn" aria-pressed={p.names} onClick={() => p.onNames(!p.names)}>{tt("ui.names")}</button>
      {lesson.scene && <button className="chipbtn" aria-pressed={p.intervals} onClick={() => p.onIntervals(!p.intervals)}>{tt("ui.intervals")}</button>}
    </span>
  );
  const prompt = text.prompt && (
    <p className="tut-prompt">
      <span className="tut-task-label">{tt("ui.task")}</span> <Inline text={text.prompt} />
    </p>
  );
  const scene = lesson.scene;
  const label = text.title;

  if ((task.kind === "write" || task.kind === "judge") && scene) {
    return (
      <section className="tut-task">
        {prompt}
        {viewToggles}
        {scene.open.length > 0 && <p className="help-line">{tt("ui.writeHere")}</p>}
        <WriteScene scene={scene} mode={task.kind} check={task.kind === "write" ? task.check : undefined} names={p.names} intervals={p.intervals} onDone={p.onDone} player={player} hint={text.hint} label={label} />
      </section>
    );
  }
  if (task.kind === "trio" && lesson.trio) {
    return (
      <section className="tut-task">
        {prompt}
        {viewToggles}
        <p className="help-line">{tt("ui.writeHere")}</p>
        <TrioPane scene={lesson.trio} names={p.names} writable onDone={p.onDone} player={player} hint={text.hint} label={label} />
      </section>
    );
  }

  // Read-only scenes (to look at while listening or answering).
  // The cursor follows a clip only when that clip plays the scene drawn.
  const clips = [...(task.kind === "listen" ? task.clips : []), ...(lesson.clips ?? [])];
  const own = clips.some((c) => c.id === player.playing && c.kind === "scene");
  const shown = scene ? <ReadScene scene={scene} names={p.names} intervals={p.intervals} cursor={own ? player.cursor : -1} label={label} /> : null;
  const trioClip = clips.find((c) => c.kind === "columns" && lesson.trio && c.columns.length === lesson.trio.answer[0].length)?.id;
  const trio = lesson.trio ? <TrioPane scene={lesson.trio} names={p.names} writable={false} pulse={pulse} player={player} label={label} cursorClip={trioClip} /> : null;

  if (task.kind === "listen") {
    return (
      <section className="tut-task">
        {prompt}
        {viewToggles}
        {shown}
        {trio}
        <ClipButtons clips={task.clips} labels={text.clips} heard={p.heard} onHeard={p.onHeard} player={player} />
      </section>
    );
  }
  if (task.kind === "quiz") {
    return (
      <section className="tut-task">
        {prompt}
        {trio}
        <Quiz
          quiz={task.quiz}
          items={task.items}
          choices={task.choices}
          labels={text.choices}
          names={p.names}
          onDone={() => p.onDone(true)}
          player={player}
          onBar={(b) => setPulse(b === null ? undefined : [b])}
        />
        {text.hint && <p className="help-line"><Inline text={text.hint} /></p>}
      </section>
    );
  }
  if (task.kind === "choice") return <Choice lesson={lesson} player={player} names={p.names} onDone={() => p.onDone(true)} prompt={prompt} />;
  if (task.kind === "game") {
    return (
      <section className="tut-task">
        {prompt}
        <button className="primary tut-go" onClick={() => p.onGame(task.voices, task.stepId)}>{tt(task.voices === "wtc" ? "ui.openStudy" : "ui.openGame")}</button>
      </section>
    );
  }
  if (task.kind === "tour") {
    return (
      <section className="tut-task">
        {prompt}
        <button className="primary tut-go" onClick={p.onTour}>{tt("ui.startTour")}</button>
      </section>
    );
  }
  // Reading.
  return (
    <>
      {viewToggles}
      {shown}
      {trio}
      {lesson.id === "end.path" && <RoadMap trio={TRIO_ALL} />}
    </>
  );
}

function ReadScene({ scene, names, intervals, cursor, label }: { scene: Scene; names: boolean; intervals: boolean; cursor: number; label: string }) {
  return <SceneScore scene={scene} notes={scene.answer ?? scene.start} cursor={cursor} names={names} intervals={intervals} label={label} />;
}

/** A choice: text answers, or bars drawn and heard (each judged by the engine, see the tests). */
function Choice({ lesson, player, names, onDone, prompt }: { lesson: Lesson; player: ReturnType<typeof usePlayer>; names: boolean; onDone(): void; prompt: React.ReactNode }) {
  const task = lesson.task;
  const text = lessonText(lesson.id);
  const [picked, setPicked] = useState<string | null>(null);
  const right = useMemo(() => (task.kind === "choice" ? task.options.find((o) => o.correct)?.id : undefined), [task]);
  if (task.kind !== "choice") return null;
  const pick = (id: string) => {
    setPicked(id);
    if (id === right) onDone();
  };
  return (
    <section className="tut-task">
      {prompt}
      <div className={task.scene ? "tut-options scored" : "tut-options"}>
        {task.options.map((o) => {
          const scene: Scene | undefined = task.scene && o.notes ? { ...task.scene, answer: o.notes, start: o.notes } : undefined;
          const state = picked === o.id ? (o.correct ? "right" : "wrong") : picked === right && o.correct ? "right" : "";
          return (
            <div key={o.id} className={`tut-option ${state}`}>
              {scene && (
                <>
                  <SceneScore scene={scene} notes={o.notes!} cursor={player.playing === o.id ? player.cursor : -1} names={names} intervals={false} result={picked === o.id && !o.correct ? judge(scene, o.notes!) : null} label={text.options?.[o.id]?.label ?? o.id} compact />
                  <button className="tut-clip" aria-pressed={player.playing === o.id} onClick={() => player.play(o.id, sceneEventsWindow(scene), audio.barSeconds)}>
                    {player.playing === o.id ? "■" : "▶"}
                  </button>
                </>
              )}
              <button className="tut-pick" disabled={picked === right} onClick={() => pick(o.id)}>
                {text.options?.[o.id]?.label ?? o.id}
              </button>
              {picked === o.id && <p className={`tut-say ${o.correct ? "ok" : "bad"}`}>{o.correct ? "✓ " : `${tt("ui.choiceAgain")} `}{text.options?.[o.id]?.why}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The bars of a scene's window, to hear an option. */
const sceneEventsWindow = (s: Scene) => sceneEvents(s, s.answer ?? s.start, s.window?.[0] ?? 0, s.window?.[1] ?? s.cantus.length - 1);
