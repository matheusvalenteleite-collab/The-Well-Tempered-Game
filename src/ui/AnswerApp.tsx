/**
 * The WTC mode, level F2: the answer (docs/wtc/PLAN.md). For each fugue the player hears the
 * subject and chooses the answer: the real one, the textbook tonal one, or (where Bach did neither)
 * his own; Compare shows whose each is and which notes the mutation changed.
 */
import { useEffect, useMemo, useState } from "react";
import { FUGUES, events, mutated, options } from "../wtc/answers.ts";
import type { Mode } from "./Root.tsx";
import type { WtcLevel } from "./WtcRoot.tsx";
import { LineStaff } from "./notation/LineStaff.tsx";
import { HFader } from "./HFader.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { Shell } from "./Shell.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = Record<string, number>;
const LETTERS = "ABCD";

export function AnswerApp({ onMode, level, onLevel }: { onMode(mode: Mode): void; level: WtcLevel; onLevel(l: WtcLevel): void }) {
  const [index, setIndex] = useState(() => Math.max(0, FUGUES.findIndex((f) => f.id === stored("wtg.answerFugue", FUGUES[0].id, (v) => typeof v === "string"))));
  const f = FUGUES[index];
  useEffect(() => store("wtg.answerFugue", f.id), [f.id]);
  const [picks, setPicks] = useState<Picks>(() => stored<Picks>("wtg.answers", {}, (v) => typeof v === "object" && v !== null));
  useEffect(() => store("wtg.answers", picks), [picks]);
  const [compared, setCompared] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("compare");
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [playing, setPlaying] = useState(false);
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  useEffect(() => () => audio.stop(), []);

  const opts = useMemo(() => options(f), [f]);
  const mine = picks[f.id];
  const chosen = mine === undefined ? null : opts[mine];
  const show = !!compared[f.id];
  const bachIdx = opts.findIndex((o) => o.is.includes("bach"));
  const answered = FUGUES.filter((x) => picks[x.id] !== undefined);
  const withBach = answered.filter((x) => options(x)[picks[x.id]]?.is.includes("bach")).length;

  function play(answer: string[] | null) {
    if (playing) {
      audio.stop();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    void audio.playSequence(events(f, answer), audio.barSeconds).then(() => setPlaying(false));
  }
  const goTo = (i: number) => {
    audio.stop();
    setPlaying(false);
    setIndex(i);
  };
  const tags = (o: (typeof opts)[number]) => o.is.map((x) => t(`wtc.ans.${x}`)).join(" = ");

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t("ui.nav.prev")}>‹</button>
            <select id="voices" className="sel sel-voices" value="wtc" aria-label={t("ui.nav.voices")} onChange={(e) => { audio.stop(); const v = e.target.value; onMode(v === "chorale" || v === "wtc" ? v : (Number(v) as 2 | 3)); }}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="chorale">{t("chorale.mode")}</option>
              <option value="wtc">{t("wtc.mode")}</option>
            </select>
            <select id="level" className="sel sel-species" value={level} aria-label={t("chorale.level")} onChange={(e) => { audio.stop(); onLevel(e.target.value as WtcLevel); }}>
              <option value="p1">{t("wtc.piece.p1")}</option>
              <option value="f2">{t("wtc.level.f2")}</option>
            </select>
            <select id="exercise" className="sel sel-exercise" value={index} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
              {FUGUES.map((x, k) => (
                <option key={x.id} value={k}>{`${picks[x.id] !== undefined ? "● " : ""}${t("wtc.fugueN", { book: x.book === 1 ? "I" : "II", n: x.number, key: x.key })}`}</option>
              ))}
            </select>
            <button className="icon" onClick={() => goTo(index + 1)} disabled={index === FUGUES.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} />
        </>
      }
      score={
        <div className="score-wrap wtc-score">
          <LineStaff
            lines={[
              { notes: f.subject, durations: f.durations, label: t("wtc.subject"), className: "subject" },
              ...opts.map((o, k) => ({
                notes: o.notes,
                durations: f.durations,
                label: show ? `${LETTERS[k]} · ${tags(o)}` : LETTERS[k],
                marks: mutated(f, o.notes),
                className: `${k === mine ? "chosen" : ""} ${show && k === bachIdx ? "bach" : ""}`,
              })),
            ]}
          />
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("wtc.ans.choose")}>
            <span className="prompt">{t("wtc.ans.prompt", { voice: f.answerVoice })}</span>
            {opts.map((o, k) => (
              <button key={k} className={mine === k ? "chord primary" : "chord"} onClick={() => { setPicks({ ...picks, [f.id]: k }); play(o.notes); }}>
                {LETTERS[k]}
              </button>
            ))}
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={show} disabled={mine === undefined} onClick={() => { setCompared({ ...compared, [f.id]: !show }); setTab("compare"); }}>{t("chorale.compare")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={() => play(chosen ? chosen.notes : null)} aria-label={t("wtc.ans.play")} title={t("wtc.ans.play")}>{playing ? "■" : "▶"}</button>
            <button onClick={() => play(null)} disabled={playing}>{t("wtc.subject")}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={show && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{t("wtc.ans.summary", { n: withBach, of: answered.length })}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("wtc.ans.source")}
      tabs={[
        {
          id: "compare",
          label: t("chorale.tab.compare"),
          text: true,
          content: show && chosen ? (
            <div className="chorale-verdicts">
              <p>
                {t("wtc.ans.yours", { letter: LETTERS[mine!] })} <strong>{tags(chosen)}</strong>. {t("wtc.ans.bachs", { letter: LETTERS[bachIdx] })} <strong>{t(`wtc.kind.${f.kind}`)}</strong>.
              </p>
              <p>{t(`wtc.explain.${f.kind}`, { tonic: f.tonic })}</p>
              {f.kind !== "real" && <p className="muted">{t("wtc.ans.changed", { notes: mutated(f, f.bach).slice(0, 8).map((i) => `${f.subject[i]} → ${f.bach[i]}`).join(", ") || "—" })}</p>}
            </div>
          ) : <p className="muted">{t("wtc.ans.before")}</p>,
        },
        {
          id: "about",
          label: t("wtc.ans.tab"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("wtc.ans.about.1")}</p>
              <p>{t("wtc.ans.about.2")}</p>
              <p className="muted">{t("wtc.ans.about.3")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
