/**
 * Three voices in the choices lab (first species): the audit of Fux's sixteen solutions and the
 * third voice added to a generated two-voice exercise. Judged by the game's three-voice rules (D90).
 */
import { useEffect, useMemo, useState } from "react";
import data from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { trioSteps, type TrioStep } from "../game/trio.ts";
import type { ModalFinal } from "../music/fux/index.ts";
import { parsePitch } from "../music/pitch.ts";
import { TrioScore } from "../ui/notation/TrioScore.tsx";
import { TRIO_FIRST_SPECIES } from "../counterpoint/three-voice.ts";
import type { AuditSummary } from "../counterpoint/choices/audit.ts";
import type { TierName } from "../counterpoint/choices/score.ts";
import { auditTrio, auditTrios, buildTrioHabits, generateThirdVoice, judgeTrio, poolTrios, trioAccidentals, type Placement, type ThirdVoice, type TrioAudit, type TrioChoice } from "../counterpoint/choices/trio.ts";
import { playLines, stop } from "./play.ts";

export const TRIO_STEPS: TrioStep[] = trioSteps(data as never);
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const STAFF_NAMES = ["top", "middle", "bottom"];
const clefOf = (line: string[]) => (line.reduce((a, p) => a + parsePitch(p).midi, 0) / line.length >= 60 ? "treble" : "bass");

export function TrioSummary({ s, who }: { s: AuditSummary; who: string }) {
  return (
    <div className="lab-summary">
      <span><b>{s.choices}</b> choices</span>
      <span><b>{s.meanLegal.toFixed(1)}</b> legal pitches per choice</span>
      <span><b>{pct(s.forced, s.choices)}</b> forced (only {who} is legal)</span>
      <span title="Only the choices where more than one pitch is legal; ranked first alone"><b>{pct(s.fuxFirstFree, s.free)}</b> {who} first where there was a choice ({s.free})</span>
      <span>mean rank <b>{s.meanRank.toFixed(2)}</b></span>
      {s.fuxIllegal > 0 && <span className="lab-bad"><b>{s.fuxIllegal}</b> where the written note breaks a rule</span>}
    </div>
  );
}

function TrioStrip({ choices, selected, onSelect }: { choices: TrioChoice[]; selected?: number; onSelect: (k: number) => void }) {
  return (
    <span className="lab-strip">
      {choices.map((u, k) => (
        <button key={k} className={`lab-cell${u.rank !== 1 ? " lab-miss" : ""}${u.legal === 1 ? " lab-forced" : ""}${k === selected ? " lab-sel" : ""}`} title={`bar ${k + 1}: ${u.legal} legal, written note ranked ${u.rank || "illegal"}`} onClick={() => onSelect(k)}>
          {u.legal}
        </button>
      ))}
    </span>
  );
}

/** The three staves, read-only; `alt` replaces one note of one voice, the written one then drawn as a diamond. */
function Trio({ voices, cantusIndex, added, alt, selected, label }: { voices: string[][]; cantusIndex: number; added?: number; alt?: { voice: number; bar: number; pitch: string } | null; selected?: { voice: number; bar: number } | null; label: string }) {
  const [cursor, setCursor] = useState(-1);
  const shown = voices.map((l, v) => (alt && alt.voice === v ? l.map((p, k) => (k === alt.bar ? alt.pitch : p)) : l));
  return (
    <>
      <div className="lab-row">
        <button onClick={() => playLines(shown, 80, setCursor)}>▶ Play</button>
        <button onClick={() => stop()}>■</button>
        <span className="lab-note">Staves: {voices.map((_, v) => `${STAFF_NAMES[v]} ${v === cantusIndex ? "cantus firmus" : v === added ? "new voice" : "counterpoint"}`).join(" · ")}</span>
      </div>
      <div className="lab-score">
        <TrioScore
          staves={shown.map((notes, v) => ({ clef: clefOf(voices[v]), notes, editable: false, label: v === cantusIndex ? "Cantus firmus" : v === added ? "New voice" : undefined, fux: alt && alt.voice === v ? voices[v] : undefined }))}
          active={selected?.voice ?? -1}
          selected={selected?.bar ?? -1}
          cursor={cursor}
          figures
          names
          label={label}
          onPlace={() => undefined}
          onSelect={() => undefined}
          zoom={1}
          onZoom={() => undefined}
          zoomLabels={{ in: "Zoom in", out: "Zoom out", reset: "100%" }}
        />
      </div>
    </>
  );
}

function TrioChoiceDetail({ audit, at, setAt, writtenLabel }: { audit: TrioAudit; at: { i: number; bar: number }; setAt: (x: { i: number; bar: number }) => void; writtenLabel: string }) {
  const v = audit.voices[at.i];
  const u = audit.choices[at.i][at.bar];
  const [alt, setAlt] = useState<string | null>(null);
  useEffect(() => setAlt(null), [audit, at.i, at.bar]);
  return (
    <div className="lab-detail">
      <div className="lab-row">
        <button onClick={() => setAt({ ...at, bar: Math.max(0, at.bar - 1) })} aria-label="Previous bar">‹</button>
        <span>
          {STAFF_NAMES[v]} voice, bar {at.bar + 1} · {writtenLabel} {u.written} · {u.legal} legal · ranked {u.rank || "—"}
          {u.ties ? ` (tied with ${u.ties})` : ""}
        </span>
        <button onClick={() => setAt({ ...at, bar: Math.min(audit.choices[at.i].length - 1, at.bar + 1) })} aria-label="Next bar">›</button>
      </div>
      <Trio voices={audit.step.fux} cantusIndex={audit.step.cantusIndex} alt={alt ? { voice: v, bar: at.bar, pitch: alt } : null} selected={{ voice: v, bar: at.bar }} label="Three voices" />
      {alt && <p className="lab-note">Showing {alt} in place of {u.written}; the written note is drawn as a diamond.</p>}
      <table className="lab-table">
        <thead>
          <tr>
            <th>pitch</th>
            <th>legal</th>
            <th>errors</th>
            <th>warnings</th>
            <th title="motion into a perfect consonance + bar without a third or sixth + repetition + leaps">counsel</th>
            <th title="bits: sonority + spacing + melodic">habit</th>
          </tr>
        </thead>
        <tbody>
          {u.candidates.map((c) => (
            <tr key={c.pitch} className={`${c.legal ? "" : "lab-illegal"}${c.written ? " lab-written" : ""}${alt === c.pitch ? " lab-alt" : ""}`} onClick={() => setAlt(c.written ? null : c.pitch)}>
              <td>{c.pitch}{c.written ? " ★" : ""}</td>
              <td>{c.legal ? "✓" : "✗"}</td>
              <td className="lab-ids">{c.errors.join(", ")}</td>
              <td className="lab-ids">{c.warnings.join(", ")}</td>
              <td title={`motion ${c.counsel.motion}, triad ${c.counsel.perfect}, repetition ${c.counsel.repeat}, leaps ${c.counsel.leap}`}>{c.tiers.counsel}</td>
              <td>{c.tiers.habit.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrioAuditList({ audits, sel, setSel }: { audits: TrioAudit[]; sel: { ex: number; i: number; bar: number }; setSel: (x: { ex: number; i: number; bar: number }) => void }) {
  return (
    <div className="lab-list">
      {audits.map((a, ex) => (
        <div key={a.step.exerciseId} className={`lab-ex lab-ex3${ex === sel.ex ? " lab-ex-sel" : ""}`} onClick={() => sel.ex !== ex && setSel({ ex, i: 0, bar: 0 })}>
          <span className="lab-ex-name">Fig. {a.step.figure} · {a.step.modalFinal} · CF {STAFF_NAMES[a.step.cantusIndex]}</span>
          <span className="lab-strips">
            {a.voices.map((v, i) => (
              <span key={v} className="lab-strip-row">
                <span className="lab-voice">{STAFF_NAMES[v]}</span>
                <TrioStrip choices={a.choices[i]} selected={ex === sel.ex && i === sel.i ? sel.bar : undefined} onSelect={(bar) => setSel({ ex, i, bar })} />
              </span>
            ))}
          </span>
          <span className="lab-ex-stat">{pct(a.summary.fuxFirstFree, a.summary.free)} first</span>
        </div>
      ))}
    </div>
  );
}

export function TrioAuditTab({ order, loo }: { order: TierName[]; loo: boolean }) {
  const [audits, setAudits] = useState<TrioAudit[] | null>(null);
  const [sel, setSel] = useState({ ex: 0, i: 0, bar: 0 });
  useEffect(() => {
    setAudits(null);
    const id = window.setTimeout(() => setAudits(auditTrios(TRIO_STEPS, { order, leaveOneOut: loo })), 30);
    return () => clearTimeout(id);
  }, [order, loo]);
  if (!audits) return <p className="lab-note">Judging every candidate in each of Fux's two added voices…</p>;
  return (
    <>
      <TrioSummary s={poolTrios(audits)} who="Fux's note" />
      <TrioAuditList audits={audits} sel={sel} setSel={setSel} />
      <p className="lab-note">Two strips per exercise, one for each voice Fux adds to the cantus. Each cell is a bar; the number is how many pitches the three-voice rules allow there.</p>
      <TrioChoiceDetail audit={audits[sel.ex]} at={{ i: sel.i, bar: sel.bar }} setAt={(x) => setSel({ ex: sel.ex, ...x })} writtenLabel="Fux:" />
    </>
  );
}

/** "Add a third voice" under a generated first-species exercise. */
export function AddThirdVoice({ cantus, line, cantusVoice, final, weight, temperature }: { cantus: string[]; line: string[]; cantusVoice: "upper" | "lower"; final: ModalFinal; weight: number; temperature: number }) {
  const [placement, setPlacement] = useState<Placement>("below");
  const [result, setResult] = useState<ThirdVoice | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [audit, setAudit] = useState<TrioAudit | null>(null);
  const [at, setAt] = useState({ i: 0, bar: 0 });
  const habits = useMemo(() => buildTrioHabits(TRIO_STEPS), []);
  const accidentals = useMemo(() => trioAccidentals(TRIO_STEPS), []);
  useEffect(() => (setResult(null), setAudit(null), setMessage(null)), [cantus, line]);
  const add = () => {
    setMessage("Searching…");
    setAudit(null);
    window.setTimeout(() => {
      try {
        const given: [string[], string[]] = cantusVoice === "lower" ? [line, cantus] : [cantus, line];
        const r = generateThirdVoice({ modalFinal: final, given, cantusOfGiven: cantusVoice === "lower" ? 1 : 0, placement, habits, accidentals: accidentals[final] ?? [], counselWeight: weight, temperature, seed: Math.floor(Math.random() * 2 ** 31) });
        setResult(r);
        setMessage(r.warnings.length ? `Recommendations not followed: ${r.warnings.join(", ")}` : null);
      } catch (e) {
        setResult(null);
        setMessage((e as Error).message);
      }
    }, 20);
  };
  const verdict = result ? judgeTrio({ modalFinal: final, cantusIndex: result.cantusIndex, rules: TRIO_FIRST_SPECIES }, result.voices) : null;
  const runAudit = () => {
    if (!result) return;
    const step: TrioStep = { id: "generated", ordinal: 0, exerciseId: "generated", figure: "–", page: 0, modalFinal: final, cantusIndex: result.cantusIndex, cantus, fux: result.voices, clefs: [], clefs1725: [] };
    const a = auditTrio(TRIO_STEPS, step, { leaveOneOut: false });
    setAudit(a);
    setAt({ i: Math.max(0, a.voices.indexOf(result.added)), bar: 0 });
  };
  return (
    <section className="lab-trio">
      <h2>Three voices</h2>
      <p className="lab-note">A third voice for this exercise, found the same way and judged by the game's three-voice rules (first species, Exercitium II). Each bar's lowest note is the bass.</p>
      <div className="lab-controls">
        <span className="lab-group">
          New voice{" "}
          <select value={placement} onChange={(e) => setPlacement(e.target.value as Placement)}>
            <option value="above">above both</option>
            <option value="between">between them</option>
            <option value="below">below both (a new bass)</option>
          </select>
        </span>
        <button className="primary" onClick={add}>Add a third voice</button>
        <button disabled={!result} onClick={runAudit}>Audit this trio</button>
      </div>
      {message && <p className="lab-note">{message}</p>}
      {result && (
        <>
          <Trio voices={result.voices} cantusIndex={result.cantusIndex} added={result.added} label="Generated trio" />
          {verdict && (
            <p className="lab-note">
              The game's three-voice judgement: {verdict.errors.length ? `${verdict.errors.length} errors (${[...new Set(verdict.errors.map((v) => v.ruleId))].join(", ")})` : "no rule broken"}
              {verdict.warnings.length ? `; recommendations not followed: ${[...new Set(verdict.warnings.map((v) => v.ruleId))].join(", ")}` : ""}.
            </p>
          )}
        </>
      )}
      {audit && (
        <>
          <TrioSummary s={audit.summary} who="the generated note" />
          <TrioAuditList audits={[audit]} sel={{ ex: 0, ...at }} setSel={(x) => setAt({ i: x.i, bar: x.bar })} />
          <TrioChoiceDetail audit={audit} at={at} setAt={setAt} writtenLabel="written:" />
        </>
      )}
    </section>
  );
}
