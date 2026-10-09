/**
 * The choices lab (a page of its own, beside the game): the alternatives audit over Fux's
 * solutions, and the cantus firmus and counterpoint generators. For the owner to try before the
 * ideas enter the game (docs/BACKLOG.md, "Analysis, scoring and generation").
 */
import { useEffect, useMemo, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal, Staff } from "../music/fux/index.ts";
import { slotLayout, type SpeciesId } from "../counterpoint/layout.ts";
import { displayClefs } from "../game/exercise-view.ts";
import { ScoreView } from "../ui/notation/ScoreView.tsx";
import { rulesForStep } from "../counterpoint/curriculum/index.ts";
import { auditLine, auditSpecies, lastStepOf, pool, type AuditSummary, type ExerciseAudit } from "../counterpoint/choices/audit.ts";
import { fuxLines, type FuxLine } from "../counterpoint/choices/corpus.ts";
import { buildHabits } from "../counterpoint/choices/habits.ts";
import type { TierName } from "../counterpoint/choices/score.ts";
import { checkCantus, clefFor, generateCantus, placeCantus, transpose, type Register } from "../counterpoint/choices/cantus.ts";
import type { ClefId } from "../ui/notation/clefs.ts";
import { DEFAULT_COUNSEL_WEIGHT, DEFAULT_TEMPERATURE, generateCounterpoint } from "../counterpoint/choices/counterpoint.ts";
import { judgeLine } from "../counterpoint/choices/alternatives.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "../counterpoint/choices/vocabulary.ts";
import { play, playLines, stop } from "./play.ts";
import { HabitsTab } from "./Habits.tsx";
import { addThirdVoice, auditGeneratedTrio, judgeGeneratedTrio, TrioAuditList, TrioAuditTab, TrioChoiceDetail, TrioSummary } from "./Trio.tsx";
import type { Placement, ThirdVoice, TrioAudit } from "../counterpoint/choices/trio.ts";

const SPECIES: SpeciesId[] = ["first", "second", "third", "fourth"];
const FINALS: ModalFinal[] = ["D", "E", "F", "G", "A", "C"];
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");

function Summary({ s, who = "Fux's note" }: { s: AuditSummary; who?: string }) {
  return (
    <div className="lab-summary">
      <span><b>{s.choices}</b> choices</span>
      <span><b>{s.meanLegal.toFixed(1)}</b> legal pitches per choice</span>
      <span><b>{pct(s.forced, s.choices)}</b> forced (only {who} is legal)</span>
      <span><b>{pct(s.fuxFirst, s.choices)}</b> {who} ranked first</span>
      <span title="Only the choices where more than one pitch is legal; ranked first alone"><b>{pct(s.fuxFirstFree, s.free)}</b> first where there was a choice ({s.free})</span>
      <span>mean rank <b>{s.meanRank.toFixed(2)}</b></span>
      <span title="log2 of the legal pitches, averaged over the choices: 0 = every note forced; lower = harder (docs/fux/difficulty.md)">freedom <b>{s.freedom.toFixed(2)}</b> bits</span>
      {s.fuxIllegal > 0 && <span className="lab-bad"><b>{s.fuxIllegal}</b> where the written note breaks a rule</span>}
    </div>
  );
}

/** One cell per choice: the number of legal pitches; outlined where the written note is not ranked first. */
function Strip({ audit, selected, onSelect }: { audit: ExerciseAudit; selected?: number; onSelect?: (i: number) => void }) {
  return (
    <span className="lab-strip">
      {audit.units.map((u, i) => (
        <button
          key={i}
          className={`lab-cell${u.rank !== 1 ? " lab-miss" : ""}${u.legal === 1 ? " lab-forced" : ""}${i === selected ? " lab-sel" : ""}`}
          title={`bar ${u.bar + 1}${u.beat ? ` beat ${u.beat + 1}` : ""}: ${u.legal} legal, written note ranked ${u.rank || "illegal"}`}
          onClick={() => onSelect?.(i)}
        >
          {u.legal}
        </button>
      ))}
    </span>
  );
}

function ChoiceDetail({ audit, choice, setChoice, writtenLabel }: { audit: ExerciseAudit; choice: number; setChoice: (i: number) => void; writtenLabel: string }) {
  const l = audit.line;
  const u = audit.units[Math.min(choice, audit.units.length - 1)];
  const [alt, setAlt] = useState<string | null>(null);
  const [cursor, setCursor] = useState(-1);
  useEffect(() => setAlt(null), [audit, choice]);
  const shown = useMemo(() => {
    const line = [...l.line];
    if (alt) for (const s of u.unit) line[s] = alt;
    return line;
  }, [l, u, alt]);
  return (
    <div className="lab-detail">
      <div className="lab-row">
        <button onClick={() => setChoice(Math.max(0, choice - 1))} aria-label="Previous choice">‹</button>
        <span>
          Choice {choice + 1} of {audit.units.length}: bar {u.bar + 1}
          {u.beat ? `, beat ${u.beat + 1}` : ""} · {writtenLabel} {u.written} · {u.legal} legal · ranked {u.rank || "—"}
          {u.ties ? ` (tied with ${u.ties})` : ""}
        </span>
        <button onClick={() => setChoice(Math.min(audit.units.length - 1, choice + 1))} aria-label="Next choice">›</button>
        <button onClick={() => play(l.cantus, shown, l.layout, 80, setCursor)}>▶ Play</button>
        <button onClick={() => stop()}>■</button>
      </div>
      <div className="lab-score">
        <ScoreView
          cantus={l.cantus}
          counterpoint={shown}
          layout={l.layout}
          cantusVoice={l.cantusVoice}
          clefs={displayClefs(l.cantus, l.cantusVoice)}
          selected={u.unit[0]}
          cursor={cursor}
          label="Score"
          fux={alt ? l.line : undefined}
          playerLabel={alt ? `with ${alt}` : writtenLabel.replace(":", "")}
          ties={l.species === "fourth"}
          showNames
          readOnly
          onPlace={() => undefined}
          onSelect={(k) => {
            const i = audit.units.findIndex((x) => x.unit.includes(k));
            if (i >= 0) setChoice(i);
          }}
        />
      </div>
      {alt && <p className="lab-note">Showing {alt} in place of {u.written}; the written line is drawn in diamonds.</p>}
      <div className="lab-table-wrap">
      <table className="lab-table">
        <thead>
          <tr>
            <th>pitch</th>
            <th>legal</th>
            <th>errors</th>
            <th>warnings</th>
            <th title="motion + perfect + repetition + leaps">counsel</th>
            <th title="bits: melodic + vertical">habit</th>
          </tr>
        </thead>
        <tbody>
          {u.candidates.map((c) => (
            <tr key={c.pitch} className={`${c.legal ? "" : "lab-illegal"}${c.written ? " lab-written" : ""}${alt === c.pitch ? " lab-alt" : ""}`} onClick={() => setAlt(c.written ? null : c.pitch)}>
              <td>{c.pitch}{c.written ? " ★" : ""}</td>
              <td>{c.legal ? "✓" : "✗"}</td>
              <td className="lab-ids">{c.errors.join(", ")}</td>
              <td className="lab-ids">{c.warnings.join(", ")}</td>
              <td title={`motion ${c.counsel.motion}, perfect ${c.counsel.perfect}, repetition ${c.counsel.repeat}, leaps ${c.counsel.leap}`}>{c.tiers.counsel}</td>
              <td title={`melodic ${c.habit.melodic.toFixed(1)} + vertical ${c.habit.vertical.toFixed(1)}`}>{c.tiers.habit.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="lab-note">Legal candidates are listed best first by the tiers chosen above; click a row to hear and see it in place. ★ = the written note.</p>
    </div>
  );
}

function TierPicker({ order, setOrder }: { order: TierName[]; setOrder: (o: TierName[]) => void }) {
  const has = (t: TierName) => order.includes(t);
  const toggle = (t: TierName) => setOrder((["errors", "warnings", "counsel", "habit"] as TierName[]).filter((x) => x === "errors" || (x === t ? !has(t) : has(x))));
  return (
    <span className="lab-group">
      Rank by: errors
      {(["warnings", "counsel", "habit"] as TierName[]).map((t) => (
        <label key={t}>
          <input type="checkbox" checked={has(t)} onChange={() => toggle(t)} /> {t}
        </label>
      ))}
    </span>
  );
}

function AuditTab() {
  const [species, setSpecies] = useState<SpeciesId | "trio">("first");
  const [rules, setRules] = useState<"step" | "species">("step");
  const [order, setOrder] = useState<TierName[]>(["errors", "warnings", "counsel", "habit"]);
  const [loo, setLoo] = useState(true);
  const [results, setResults] = useState<ExerciseAudit[] | null>(null);
  const [ex, setEx] = useState(0);
  const [choice, setChoice] = useState(0);
  useEffect(() => {
    setResults(null);
    if (species === "trio") return;
    const id = window.setTimeout(() => setResults(auditSpecies(repository, species, { rules, order, leaveOneOut: loo })), 30);
    return () => clearTimeout(id);
  }, [species, rules, order, loo]);
  useEffect(() => setChoice(0), [ex, species]);
  return (
    <section>
      <div className="lab-controls">
        <span className="lab-group">
          Species{" "}
          <select value={species} onChange={(e) => (setSpecies(e.target.value as SpeciesId | "trio"), setEx(0))}>
            {SPECIES.map((s) => <option key={s}>{s}</option>)}
            <option value="trio">first, three voices</option>
          </select>
        </span>
        <span className="lab-group" hidden={species === "trio"}>
          Rules{" "}
          <select value={rules} onChange={(e) => setRules(e.target.value as "step" | "species")}>
            <option value="step">in force at the exercise's step</option>
            <option value="species">all rules of the species</option>
          </select>
        </span>
        <TierPicker order={order} setOrder={setOrder} />
        <label className="lab-group" title="Fux's habits are measured without the exercise being judged">
          <input type="checkbox" checked={loo} onChange={(e) => setLoo(e.target.checked)} /> leave the exercise out of the habits
        </label>
      </div>
      {species === "trio" ? (
        <TrioAuditTab order={order} loo={loo} />
      ) : !results ? (
        <p className="lab-note">Judging every candidate at every choice of Fux's solutions…</p>
      ) : (
        <>
          <Summary s={pool(results)} />
          <div className="lab-list">
            {results.map((a, i) => (
              <div key={a.line.exerciseId} className={`lab-ex${i === ex ? " lab-ex-sel" : ""}`} onClick={() => setEx(i)}>
                <span className="lab-ex-name">Fig. {a.line.figure} · {a.line.modalFinal} · CF {a.line.cantusVoice === "lower" ? "below" : "above"}</span>
                <Strip audit={a} selected={i === ex ? choice : undefined} onSelect={(c) => (setEx(i), setChoice(c))} />
                <span className="lab-ex-stat" title="Fux's note ranked first · freedom (bits per choice; lower = harder)">{pct(a.summary.fuxFirst, a.summary.choices)} first · {a.summary.freedom.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <p className="lab-note">Each cell is a choice; the number is how many pitches the rules allow there. Outlined: Fux's note is not ranked first. Shaded: only Fux's note is legal.</p>
          {results[ex] && <ChoiceDetail audit={results[ex]} choice={choice} setChoice={setChoice} writtenLabel="Fux:" />}
        </>
      )}
    </section>
  );
}

/** The third voice's ink: red, as the counterpoint is blue. */
const THIRD_INK = "#c0392b";
const ruleIds = (vs: { ruleId: string }[]) => [...new Set(vs.map((v) => v.ruleId))].join(", ");

function GenerateTab() {
  const accidentals = useMemo(() => fuxAccidentals(repository), []);
  const [final, setFinal] = useState<ModalFinal>("D");
  const [length, setLength] = useState<number | "auto">("auto");
  const [wide, setWide] = useState(false);
  const [species, setSpecies] = useState<SpeciesId>("first");
  const [cantusVoice, setCantusVoice] = useState<Staff>("lower");
  const [placement, setPlacement] = useState<Placement>("below");
  const [weight, setWeight] = useState(DEFAULT_COUNSEL_WEIGHT);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  /** The cantus as generated (Fux's octave), and the register it is written in. */
  const [baseCantus, setBaseCantus] = useState<string[] | null>(null);
  const [register, setRegister] = useState<Register>("mid");
  const placed = useMemo(() => (baseCantus ? placeCantus(baseCantus, register) : null), [baseCantus, register]);
  const cantus = placed?.line ?? null;
  const [line, setLine] = useState<string[] | null>(null);
  /** Slots where the generated line breaks a rule (only when no error-free line was found). */
  const [lineErrorSlots, setLineErrorSlots] = useState<number[]>([]);
  const [trio, setTrio] = useState<ThirdVoice | null>(null);
  /** Placements for which no error-free third voice was found, for the current two lines. */
  const [unclean, setUnclean] = useState<Partial<Record<Placement, boolean>>>({});
  const [msg, setMsg] = useState<{ cantus?: string | null; line?: string | null; trio?: string | null }>({});
  const [audit, setAudit] = useState<ExerciseAudit | null>(null);
  const [trioAudit, setTrioAudit] = useState<TrioAudit | null>(null);
  const [choice, setChoice] = useState(0);
  const [trioAt, setTrioAt] = useState({ i: 0, bar: 0 });
  const [cursor, setCursor] = useState(-1);
  const seed = () => Math.floor(Math.random() * 2 ** 31);
  const clearAudits = () => (setAudit(null), setTrioAudit(null));

  const newCantus = () => {
    try {
      const g = generateCantus({ final, length: length === "auto" ? undefined : length, wideLeaps: wide, seed: seed() });
      setBaseCantus(g);
      const c = placeCantus(g, register).line;
      setLine(null);
      setTrio(null);
      setUnclean({});
      clearAudits();
      setMsg({});
      return c;
    } catch (e) {
      setMsg({ cantus: (e as Error).message });
      return null;
    }
  };
  const newLine = (c = cantus) => {
    if (!c) return;
    setMsg((m) => ({ ...m, line: "Searching…", trio: null }));
    setTrio(null);
    setUnclean({});
    clearAudits();
    window.setTimeout(() => {
      try {
        const [lo, hi] = registerWindow(c, cantusVoice);
        const g = generateCounterpoint({
          species,
          modalFinal: final,
          cantusVoice,
          cantus: c,
          rules: rulesForStep(lastStepOf(species)),
          vocabulary: pitchesBetween(lo, hi, accidentals[final]),
          habits: buildHabits(fuxLines(repository, species), species),
          counselWeight: weight,
          temperature,
          seed: seed(),
        });
        setLine(g.line);
        setLineErrorSlots(g.errorSlots);
        setMsg((m) => ({ ...m, line: null }));
      } catch (e) {
        setLine(null);
        setMsg((m) => ({ ...m, line: (e as Error).message }));
      }
    }, 20);
  };
  const newTrio = () => {
    if (!cantus || !line) return;
    setMsg((m) => ({ ...m, trio: "Searching…" }));
    clearAudits();
    window.setTimeout(() => {
      try {
        const t = addThirdVoice({ cantus, line, cantusVoice, final, placement, weight, temperature });
        setTrio(t);
        setUnclean((u) => ({ ...u, [placement]: t.errors.length > 0 }));
        setMsg((m) => ({ ...m, trio: null }));
      } catch (e) {
        setTrio(null);
        setMsg((m) => ({ ...m, trio: (e as Error).message }));
      }
    }, 20);
  };
  const layout = cantus ? slotLayout(species, cantus.length) : null;
  const check = baseCantus ? checkCantus(baseCantus, final, true, wide) : null;
  /** Clefs: the cantus in its register's clef; every other line in whichever clef leaves fewer notes off the staff. */
  const cpGuess = line ?? (cantus ? transpose(cantus, cantusVoice === "lower" ? 1 : -1) : null);
  /**
   * The third voice on the two staves: each note on the staff of the given voice nearer to it in
   * that bar (staying on the same staff on a tie), so that it crosses between them as it moves.
   */
  const third = useMemo(() => {
    if (!trio || !cantus || !line) return null;
    const notes = trio.voices[trio.added];
    const m = (p: string) => parsePitch(p).midi;
    let prev = false;
    const onCantusStaff = notes.map((p, k) => {
      const dc = Math.abs(m(p) - m(cantus[k]));
      const dl = Math.abs(m(p) - m(line[k]));
      prev = dc === dl ? prev : dc < dl;
      return prev;
    });
    return { notes, onCantusStaff };
  }, [trio, cantus, line]);
  const sounding = (l: (string | null)[]) => l.filter((p): p is string => !!p && /^[A-G]/.test(p));
  const cpStaffNotes = cpGuess ? [...sounding(cpGuess), ...(third ? third.notes.filter((_, k) => !third.onCantusStaff[k]) : [])] : [];
  const cfStaffExtra = third ? third.notes.filter((_, k) => third.onCantusStaff[k]) : [];
  const cfClef = placed ? (cfStaffExtra.length ? clefFor([...placed.line, ...cfStaffExtra]) : placed.clef) : null;
  const scoreClefs: [ClefId, ClefId] | null = cantus && cfClef && cpStaffNotes.length ? (cantusVoice === "upper" ? [cfClef, clefFor(cpStaffNotes)] : [clefFor(cpStaffNotes), cfClef]) : null;
  const verdict = useMemo(() => {
    if (!cantus || !line || !layout) return null;
    return judgeLine({ species, modalFinal: final, cantusVoice, cantus, layout, rules: rulesForStep(lastStepOf(species)), vocabulary: [], habits: buildHabits([], species) }, line);
  }, [cantus, line, layout, species, final, cantusVoice]);
  const trioVerdict = useMemo(() => (trio ? judgeGeneratedTrio(final, trio) : null), [trio, final]);
  const playAll = () => {
    if (!cantus || !layout) return;
    if (trio) playLines(trio.voices, 80, setCursor);
    else play(cantus, line ?? layout.map(() => null), layout, 80, setCursor);
  };
  const runAudit = () => {
    if (!cantus || !line || !layout) return;
    if (trio) {
      const a = auditGeneratedTrio(final, cantus, trio);
      setTrioAudit(a);
      setTrioAt({ i: Math.max(0, a.voices.indexOf(trio.added)), bar: 0 });
      return;
    }
    const fl: FuxLine = { stepId: lastStepOf(species), exerciseId: "generated", figure: "–", species, modalFinal: final, cantusVoice, cantus, layout, line };
    setAudit(auditLine(repository, fl, fuxLines(repository, species), { rules: "species", leaveOneOut: false }));
    setChoice(0);
  };
  const trioPossible = !!line && species === "first";

  return (
    <section className="lab-gen">
      <div className="lab-steps">
        <fieldset className="lab-panel">
          <legend>1 · Cantus firmus</legend>
          <div className="lab-fields">
            <label className="lab-group">
              Final
              <select id="gen-final" value={final} onChange={(e) => setFinal(e.target.value as ModalFinal)}>
                {FINALS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="lab-group">
              Notes
              <select id="gen-length" value={String(length)} onChange={(e) => setLength(e.target.value === "auto" ? "auto" : Number(e.target.value))}>
                <option value="auto">10–14</option>
                {[9, 10, 11, 12, 13, 14].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label className="lab-group" title="Low: an octave below the middle, F clef. Middle: the octave nearest middle C, in whichever clef needs fewer ledger lines. High: an octave above the middle, G clef. The melody is the same in all three.">
              Register
              <select id="gen-register" value={register} onChange={(e) => (setRegister(e.target.value as Register), setLine(null), setTrio(null), setUnclean({}), clearAudits(), setMsg({}))}>
                <option value="low">low (F clef)</option>
                <option value="mid">middle</option>
                <option value="high">high (G clef)</option>
              </select>
            </label>
            <label className="lab-group" title="Fux's rare rising fifth (F) and octave (E)">
              <input id="gen-wide" type="checkbox" checked={wide} onChange={(e) => setWide(e.target.checked)} /> rising 5th / 8ve
            </label>
          </div>
          <div className="lab-actions">
            <button className="primary" onClick={() => newCantus()}>New cantus firmus</button>
          </div>
          <p className="lab-status">
            {msg.cantus ?? (check ? (check.hard.length ? `Breaks: ${check.hard.join("; ")}` : `Every constraint kept${check.soft.length ? ` (soft: ${check.soft.join("; ")})` : ""}.`) : "None yet.")}
          </p>
        </fieldset>

        <fieldset className="lab-panel" disabled={!cantus}>
          <legend>2 · Counterpoint</legend>
          <div className="lab-fields">
            <label className="lab-group">
              Species
              <select id="gen-species" value={species} onChange={(e) => (setSpecies(e.target.value as SpeciesId), setLine(null), setTrio(null), clearAudits())}>
                {SPECIES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="lab-group">
              Cantus
              <select id="gen-cantus-voice" value={cantusVoice} onChange={(e) => (setCantusVoice(e.target.value as Staff), setLine(null), setTrio(null), clearAudits())}>
                <option value="lower">below</option>
                <option value="upper">above</option>
              </select>
            </label>
          </div>
          <div className="lab-actions">
            <button className="primary" onClick={() => newLine()}>New counterpoint</button>
          </div>
          <p className={`lab-status${verdict?.errors.length ? " lab-bad" : ""}`}>
            {msg.line ?? (verdict ? (verdict.errors.length ? `No line without errors was found for this cantus. Best possible: ${verdict.errors.length} error${verdict.errors.length > 1 ? "s" : ""} (${ruleIds(verdict.errors)}), marked in the score.` : `No rule broken${verdict.warnings.length ? `; not followed: ${ruleIds(verdict.warnings)}` : ""}.`) : "None yet.")}
          </p>
        </fieldset>

        <fieldset className="lab-panel" disabled={!trioPossible}>
          <legend>3 · Third voice</legend>
          <div className="lab-fields">
            <label className="lab-group">
              Place
              <select id="gen-placement" className={unclean[placement] ? "lab-bad-select" : ""} value={placement} onChange={(e) => setPlacement(e.target.value as Placement)}>
                {(
                  [
                    ["above", "above both"],
                    ["between", "between them"],
                    ["below", "below both (new bass)"],
                  ] as [Placement, string][]
                ).map(([v, label]) => (
                  <option key={v} value={v} className={unclean[v] ? "lab-bad-option" : ""}>
                    {label}
                    {unclean[v] ? " — errors unavoidable" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="lab-actions">
            <button className="primary" onClick={newTrio}>Add third voice</button>
            <button disabled={!trio} onClick={() => (setTrio(null), clearAudits(), setMsg((m) => ({ ...m, trio: null })))}>Remove</button>
          </div>
          <p className={`lab-status${trio?.errors.length ? " lab-bad" : ""}`}>
            {line && species !== "first"
              ? "First species only: the game has three-voice rules for first species alone so far."
              : msg.trio ??
                (trioVerdict
                  ? trioVerdict.errors.length
                    ? `Best possible: ${trioVerdict.errors.length} error${trioVerdict.errors.length > 1 ? "s" : ""} (${ruleIds(trioVerdict.errors)}), in bar${trio!.errorBars.length > 1 ? "s" : ""} ${trio!.errorBars.map((b) => b + 1).join(", ")}. ${trio!.reason ?? ""}`
                    : `No three-voice rule broken${trioVerdict.warnings.length ? `; not followed: ${ruleIds(trioVerdict.warnings)}` : ""}.`
                  : "None yet.")}
          </p>
        </fieldset>
      </div>

      <fieldset className="lab-panel lab-settings">
        <legend>Search settings (counterpoint and third voice)</legend>
        <div className="lab-fields">
          <label className="lab-group" title="0: follow Fux's habits only. Higher: also obey his stated counsel (contrary motion, imperfect consonances, no repetition, small leaps); each point of counsel counts as this many bits of habit">
            Counsel weight <input id="gen-weight" type="range" min={0} max={6} step={0.5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} /> <b>{weight}</b>
          </label>
          <label className="lab-group" title="0: always the most typical move. 0.75 (default): calibrated so that the lines leap and space themselves as often as Fux's do. Higher: rarer moves more often">
            Variety <input id="gen-variety" type="range" min={0} max={3} step={0.25} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /> <b>{temperature}</b>
          </label>
        </div>
      </fieldset>

      {cantus && layout && (
        <div className="lab-box">
          <div className="lab-box-head">
            <button className="primary" onClick={playAll}>▶ Play {trio ? "all three voices" : line ? "both voices" : "the cantus"}</button>
            <button onClick={() => stop()} aria-label="Stop">■</button>
            <span className="lab-note">{`Cantus ${cantusVoice === "lower" ? "below" : "above"} · ${species} species · counterpoint in blue${trio ? " · third voice in red, on whichever staff is nearer" : ""}`}</span>
          </div>
          <div className="lab-score">
            {(
              <ScoreView
                cantus={cantus}
                counterpoint={line ?? layout.map(() => null)}
                layout={layout}
                cantusVoice={cantusVoice}
                clefs={scoreClefs ?? displayClefs(cantus, cantusVoice)}
                selected={-1}
                cursor={cursor}
                label="Generated exercise"
                ties={species === "fourth"}
                showNames
                readOnly
                playerLabel="Counterpoint"
                extraLines={third ? [{ label: "Third voice", notes: third.notes, ink: THIRD_INK, onCantusStaff: third.onCantusStaff }] : undefined}
                marks={trio ? trio.errorBars.map((column) => ({ column, severity: "error" as const })) : line && lineErrorSlots.length ? lineErrorSlots.map((column) => ({ column, severity: "error" as const })) : undefined}
                onPlace={() => undefined}
                onSelect={() => undefined}
              />
            )}
          </div>
        </div>
      )}

      {line && (
        <fieldset className="lab-panel">
          <legend>Audit of this exercise</legend>
          <div className="lab-actions">
            <button onClick={runAudit}>Audit {trio ? "the three voices" : "the counterpoint"}</button>
            <span className="lab-note">Every alternative pitch at every note of the generated {trio ? "voices" : "line"}, judged and ranked as in the audit of Fux.</span>
          </div>
          {audit && !trio && (
            <>
              <Summary s={audit.summary} who="the generated note" />
              <Strip audit={audit} selected={choice} onSelect={setChoice} />
              <ChoiceDetail audit={audit} choice={choice} setChoice={setChoice} writtenLabel="generated:" />
            </>
          )}
          {trioAudit && trio && (
            <>
              <TrioSummary s={trioAudit.summary} who="the generated note" />
              <TrioAuditList audits={[trioAudit]} sel={{ ex: 0, ...trioAt }} setSel={(x) => setTrioAt({ i: x.i, bar: x.bar })} />
              <TrioChoiceDetail audit={trioAudit} at={trioAt} setAt={setTrioAt} writtenLabel="generated:" />
            </>
          )}
        </fieldset>
      )}
    </section>
  );
}

export function Lab() {
  const [tab, setTab] = useState<"audit" | "generate" | "habits">("audit");
  return (
    <main className="lab">
      <header className="lab-head">
        <h1>Choices lab</h1>
        <nav>
          <button className={tab === "audit" ? "primary" : ""} onClick={() => setTab("audit")}>Audit of Fux's choices</button>
          <button className={tab === "generate" ? "primary" : ""} onClick={() => setTab("generate")}>Generators</button>
          <button className={tab === "habits" ? "primary" : ""} onClick={() => setTab("habits")}>Studies</button>
        </nav>
      </header>
      <p className="lab-intro">
        {tab === "habits"
          ? "Studies of Fux's solutions: which habits predict the notes he wrote (two and three voices; each habit measured on exercises it has not seen, the ones that earn their place make the model the audit and the generators use), whether he imitates or works with motives, and how hard each exercise is."
          : tab === "audit"
          ? "At every note of Fux's solutions (two voices, species 1–4; three voices, first species), every other pitch is put in its place and the whole line is judged again by the game's rules. The legal ones are ranked by the score vector: errors, then Fux's recommendations, then his stated counsel (motion, perfect consonances, repetition, leaps), then his habits measured on his other solutions."
          : "Build an exercise in three steps: a cantus firmus from the constraints accepted in D8 (each checked against Fux's own cantus firmi); a counterpoint found by a search the game's rules judge as it goes; and, in first species, a third voice judged by the three-voice rules. All voices stand in one score and play together."}
      </p>
      {tab === "audit" ? <AuditTab /> : tab === "generate" ? <GenerateTab /> : <HabitsTab />}
    </main>
  );
}
