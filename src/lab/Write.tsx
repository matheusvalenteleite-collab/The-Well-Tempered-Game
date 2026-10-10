/**
 * "Write your own": a counterpoint written on one of Fux's cantus firmi (or a generated one), with
 * hints at every note from choices/hints.ts: the errors it causes (with Fux's page), how many
 * pitches the rules allow there, where the written note ranks, and, on request, the note Fux would
 * most likely have written. A test bed for the game's "Fux had N choices here" hint.
 */
import { useEffect, useMemo, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import type { ModalFinal, Staff } from "../music/fux/index.ts";
import { REST, slotLayout, sounding, type SpeciesId } from "../counterpoint/layout.ts";
import { displayClefs } from "../game/exercise-view.ts";
import { ScoreView } from "../ui/notation/ScoreView.tsx";
import { t } from "../ui/i18n.ts";
import { rulesForStep } from "../counterpoint/curriculum/index.ts";
import type { Rule } from "../counterpoint/rules/types.ts";
import { lastStepOf } from "../counterpoint/choices/audit.ts";
import { CHOICE_SPECIES, fuxLines } from "../counterpoint/choices/corpus.ts";
import { buildHabits } from "../counterpoint/choices/habits.ts";
import type { ChoiceContext } from "../counterpoint/choices/alternatives.ts";
import { generateCantus, placeCantus } from "../counterpoint/choices/cantus.ts";
import { hintAt, judgeWritten, legalCounts, unitAt } from "../counterpoint/choices/hints.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "../counterpoint/choices/vocabulary.ts";
import { play, stop } from "./play.ts";

const FINALS: ModalFinal[] = ["D", "E", "F", "G", "A", "C"];

/** A rule's message for the player (the game's own hint text), else its id. */
function message(ruleId: string, messageKey: string): string {
  for (const k of [`hints.${messageKey}`, `tutor.${messageKey}`]) {
    try {
      return t(k);
    } catch {
      /* next */
    }
  }
  return ruleId;
}

interface Source {
  id: string;
  label: string;
  species: SpeciesId;
  stepId: string;
  exerciseId: string | null;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  fux: string[] | null;
}

/** Move a pitch by a semitone, spelled with ♯ upwards and ♭ downwards from a natural. */
function inflect(p: string, how: "#" | "b" | "n"): string {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(p);
  if (!m) return p;
  return `${m[1]}${how === "n" ? "" : how}${m[3]}`;
}

export function WriteTab() {
  const [species, setSpecies] = useState<SpeciesId>("first");
  const lines = useMemo(() => fuxLines(repository, species), [species]);
  const [pick, setPick] = useState<string>("fux:0");
  const [generated, setGenerated] = useState<Source | null>(null);
  const [genFinal, setGenFinal] = useState<ModalFinal>("D");
  const [genVoice, setGenVoice] = useState<Staff>("lower");
  const source: Source | null = useMemo(() => {
    if (pick === "gen") return generated && generated.species === species ? generated : null;
    const l = lines[Number(pick.slice(4))];
    if (!l) return null;
    return { id: l.exerciseId, label: `Fig. ${l.figure}`, species, stepId: l.stepId, exerciseId: l.exerciseId, modalFinal: l.modalFinal, cantusVoice: l.cantusVoice, cantus: l.cantus, fux: l.line };
  }, [pick, lines, generated, species]);

  const layout = useMemo(() => (source ? slotLayout(source.species, source.cantus.length) : []), [source]);
  const [line, setLine] = useState<(string | null)[]>([]);
  const [sel, setSel] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [showFux, setShowFux] = useState(false);
  const [cursor, setCursor] = useState(-1);
  useEffect(() => {
    setLine(layout.map((_, k) => (k === 0 && species === "fourth" ? REST : null)));
    setSel(species === "fourth" ? 1 : 0);
    setReveal(false);
    setShowFux(false);
  }, [layout, species]);

  const ctx: ChoiceContext | null = useMemo(() => {
    if (!source) return null;
    const acc = fuxAccidentals(repository)[source.modalFinal];
    const [lo, hi] = registerWindow(source.cantus, source.cantusVoice, source.fux ?? []);
    const corpus = fuxLines(repository, source.species);
    return {
      species: source.species,
      modalFinal: source.modalFinal,
      cantusVoice: source.cantusVoice,
      cantus: source.cantus,
      layout,
      rules: rulesForStep(source.stepId),
      vocabulary: pitchesBetween(lo, hi, acc),
      // Fux's habits from his other solutions: the suggestion is never his own note copied.
      habits: buildHabits(corpus, source.species, source.exerciseId ? [source.exerciseId] : []),
    };
  }, [source, layout]);
  const rulesById = useMemo(() => new Map<string, Rule>((ctx?.rules ?? []).map((r) => [r.id, r])), [ctx]);

  const ready = ctx && line.length === layout.length;
  const unit = useMemo(() => (ready ? unitAt(ctx, line, sel) : [sel]), [ready, ctx, line, sel]);
  const hint = useMemo(() => (ready ? hintAt(ctx, line, unit) : null), [ready, ctx, line, unit]);
  const [counts, setCounts] = useState<ReturnType<typeof legalCounts> | null>(null);
  useEffect(() => {
    setCounts(null);
    if (!ready) return;
    const id = window.setTimeout(() => setCounts(legalCounts(ctx, line)), 60);
    return () => clearTimeout(id);
  }, [ready, ctx, line]);
  const verdict = useMemo(() => (ready ? judgeWritten(ctx, line) : null), [ready, ctx, line]);
  const complete = line.length > 0 && line.every((p, k) => sounding(p) || (k === 0 && (species === "fourth" || p === REST)));

  const write = (k: number, p: string | null) => {
    setLine((l) => l.map((q, j) => (j === k ? p : q)));
    setReveal(false);
  };
  const place = (k: number, natural: string) => {
    if (k === 0 && species === "fourth") return;
    write(k, natural);
    setSel(Math.min(layout.length - 1, k + 1));
  };
  const newCantus = () => {
    const g = generateCantus({ final: genFinal, seed: Math.floor(Math.random() * 2 ** 31) });
    const cantus = placeCantus(g, "mid").line;
    setGenerated({ id: `gen-${Date.now()}`, label: "generated", species, stepId: lastStepOf(species), exerciseId: null, modalFinal: genFinal, cantusVoice: genVoice, cantus, fux: null });
    setPick("gen");
  };
  const selectedViolations = verdict ? verdict.errors.filter((v) => v.positions.some((p) => unit.includes(p))) : [];
  const selectedWarnings = verdict ? verdict.warnings.filter((v) => v.positions.some((p) => unit.includes(p))) : [];
  const ref = (id: string) => rulesById.get(id)?.attribution?.ref;
  const written = hint?.written ?? null;
  const fuxNote = source?.fux?.[unit[0]];

  return (
    <section className="lab-gen">
      <fieldset className="lab-panel">
        <legend>Exercise</legend>
        <div className="lab-fields">
          <label className="lab-group">
            Species
            <select value={species} onChange={(e) => (setSpecies(e.target.value as SpeciesId), setPick("fux:0"))}>
              {CHOICE_SPECIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="lab-group">
            Cantus
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              {lines.map((l, i) => (
                <option key={l.exerciseId} value={`fux:${i}`}>
                  Fux, Fig. {l.figure} · {l.modalFinal} · cantus {l.cantusVoice === "lower" ? "below" : "above"}
                </option>
              ))}
              {generated && generated.species === species && <option value="gen">generated · {generated.modalFinal} · cantus {generated.cantusVoice === "lower" ? "below" : "above"}</option>}
            </select>
          </label>
          <span className="lab-group">
            or a new cantus on
            <select value={genFinal} onChange={(e) => setGenFinal(e.target.value as ModalFinal)}>
              {FINALS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <select value={genVoice} onChange={(e) => setGenVoice(e.target.value as Staff)}>
              <option value="lower">below</option>
              <option value="upper">above</option>
            </select>
            <button onClick={newCantus}>New cantus</button>
          </span>
        </div>
        <p className="lab-note">
          Click on the counterpoint's staff to write a note (the selection then moves on); ♯ ♭ ♮ and Clear act on the selected note. Rules: those in force at {source?.exerciseId ? "the exercise's step" : `the end of ${species} species`}.
        </p>
      </fieldset>

      {source && ctx && (
        <div className="lab-box">
          <div className="lab-box-head">
            <button className="primary" onClick={() => play(source.cantus, line, layout, 80, setCursor)}>▶ Play</button>
            <button onClick={() => stop()} aria-label="Stop">■</button>
            <button disabled={!sounding(line[sel])} onClick={() => write(sel, inflect(line[sel]!, "#"))}>♯</button>
            <button disabled={!sounding(line[sel])} onClick={() => write(sel, inflect(line[sel]!, "b"))}>♭</button>
            <button disabled={!sounding(line[sel])} onClick={() => write(sel, inflect(line[sel]!, "n"))}>♮</button>
            <button disabled={!sounding(line[sel])} onClick={() => write(sel, null)}>Clear</button>
            {species === "second" && sel === 0 && <button onClick={() => (write(0, REST), setSel(1))} title="Fux opens some second-species lines with a half rest">Rest</button>}
            <button onClick={() => setLine(layout.map((_, k) => (k === 0 && species === "fourth" ? REST : null)))}>Clear all</button>
            {source.fux && (
              <label className="lab-group" title="Fux's own solution in diamonds">
                <input type="checkbox" checked={showFux} onChange={(e) => setShowFux(e.target.checked)} /> show Fux's solution
              </label>
            )}
            <span className="lab-note">
              {verdict ? (complete ? (verdict.errors.length ? `${verdict.errors.length} error${verdict.errors.length > 1 ? "s" : ""} in the line` : "Complete; no rule broken.") : `${line.filter(sounding).length} of ${layout.length - (species === "fourth" ? 1 : 0)} notes written`) : ""}
            </span>
          </div>
          <div className="lab-score">
            <ScoreView
              cantus={source.cantus}
              counterpoint={line}
              layout={layout}
              cantusVoice={source.cantusVoice}
              clefs={displayClefs(source.cantus, source.cantusVoice)}
              selected={sel}
              cursor={cursor}
              label="Your counterpoint"
              fux={showFux && source.fux ? source.fux : undefined}
              ties={species === "fourth"}
              showNames
              showGhost
              marks={verdict ? [...verdict.errors.flatMap((v) => v.positions.map((column) => ({ column, severity: "error" as const }))), ...verdict.warnings.flatMap((v) => v.positions.map((column) => ({ column, severity: "warning" as const })))] : undefined}
              onPlace={place}
              onSelect={setSel}
            />
          </div>
        </div>
      )}

      {counts && (
        <div className="lab-row">
          <span className="lab-note">Legal pitches at each choice, given the rest of your line:</span>
          <span className="lab-strip">
            {counts.map((c, i) => (
              <button
                key={i}
                className={`lab-cell${c.written && c.rank !== 1 ? " lab-miss" : ""}${c.legal === 1 ? " lab-forced" : ""}${c.unit.includes(sel) ? " lab-sel" : ""}`}
                title={`bar ${ctx!.layout[c.unit[0]].bar + 1}: ${c.legal} legal${c.written ? `; ${c.written} ${c.rank ? "is legal" : "breaks a rule"}` : ""}`}
                onClick={() => setSel(c.unit[0])}
              >
                {c.legal}
              </button>
            ))}
          </span>
        </div>
      )}

      {ready && !hint && (
        <p className="lab-note">This note is judged once the rest of its bar and the next downbeat are written (the rules see a note with what follows it).</p>
      )}
      {hint && ctx && (
        <fieldset className="lab-panel">
          <legend>
            Bar {hint.bar + 1}
            {hint.beat ? `, beat ${hint.beat + 1}` : ""}
            {written ? `: ${written}` : ": nothing written yet"}
          </legend>
          <p className="lab-prose">
            The rules allow <b>{hint.legal}</b> pitch{hint.legal === 1 ? "" : "es"} here, given the rest of your line
            {hint.legal ? <> ({hint.candidates.filter((c) => c.legal).map((c) => c.pitch).join(", ")})</> : null}.
            {written && hint.rank > 0 && <> Your note is legal, ranked <b>{hint.rank}</b> of {hint.legal} by Fux's recommendations, counsel and habits.</>}
            {written && hint.rank === 0 && <> Your note breaks a rule.</>}
          </p>
          {[...selectedViolations, ...selectedWarnings].length > 0 && (
            <ul className="lab-prose">
              {selectedViolations.map((v, i) => (
                <li key={`e${i}`} className="lab-bad">
                  {message(v.ruleId, v.messageKey)} <span className="lab-ids">({v.ruleId}{ref(v.ruleId) ? `; ${ref(v.ruleId)}` : ""})</span>
                </li>
              ))}
              {selectedWarnings.map((v, i) => (
                <li key={`w${i}`}>
                  Recommendation: {message(v.ruleId, v.messageKey)} <span className="lab-ids">({v.ruleId}{ref(v.ruleId) ? `; ${ref(v.ruleId)}` : ""})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="lab-actions">
            <button disabled={!hint.best} onClick={() => setReveal((r) => !r)}>{reveal ? "Hide" : "What would Fux write?"}</button>
            {reveal && hint.best && (
              <>
                <span>
                  Most likely: <b>{hint.best}</b>
                  {fuxNote && sounding(fuxNote) ? <> · Fux wrote: <b>{fuxNote}</b></> : null}
                </span>
                <button onClick={() => (unit.forEach((s) => write(s, hint.best)), setSel(Math.min(layout.length - 1, unit[unit.length - 1] + 1)))}>Write {hint.best}</button>
              </>
            )}
          </div>
          {reveal && (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>pitch</th>
                    <th>legal</th>
                    <th>would break</th>
                    <th>recommendations not followed</th>
                    <th>counsel</th>
                    <th>habit (bits)</th>
                  </tr>
                </thead>
                <tbody>
                  {hint.candidates.map((c) => (
                    <tr key={c.pitch} className={`${c.legal ? "" : "lab-illegal"}${c.written ? " lab-written" : ""}`} onClick={() => unit.forEach((s) => write(s, c.pitch))}>
                      <td>{c.pitch}{c.written ? " ★" : ""}</td>
                      <td>{c.legal ? "✓" : "✗"}</td>
                      <td className="lab-ids">{c.errors.join(", ")}</td>
                      <td className="lab-ids">{c.warnings.join(", ")}</td>
                      <td>{c.tiers.counsel}</td>
                      <td>{c.tiers.habit.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="lab-note">Click a row to write that pitch. The ranking follows the audit's tiers: errors, recommendations, counsel, habits (learnt without this exercise).</p>
        </fieldset>
      )}
    </section>
  );
}
