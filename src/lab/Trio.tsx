/**
 * Three voices in the choices lab (first species): the audit of Fux's sixteen solutions and the
 * third voice added to a generated two-voice exercise. Judged by the game's three-voice rules (D90).
 */
import { useEffect, useState } from "react";
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
export function Trio({ voices, cantusIndex, added, alt, selected, label, cursor: outerCursor, transport = true, errorBars = [] }: { voices: string[][]; cantusIndex: number; added?: number; alt?: { voice: number; bar: number; pitch: string } | null; selected?: { voice: number; bar: number } | null; label: string; cursor?: number; transport?: boolean; errorBars?: number[] }) {
  const [ownCursor, setCursor] = useState(-1);
  const cursor = outerCursor ?? ownCursor;
  const shown = voices.map((l, v) => (alt && alt.voice === v ? l.map((p, k) => (k === alt.bar ? alt.pitch : p)) : l));
  return (
    <>
      {transport && (
        <div className="lab-row">
          <button onClick={() => playLines(shown, 80, setCursor)}>▶ Play</button>
          <button onClick={() => stop()}>■</button>
          <span className="lab-note">Staves: {voices.map((_, v) => `${STAFF_NAMES[v]} ${v === cantusIndex ? "cantus firmus" : v === added ? "new voice" : "counterpoint"}`).join(" · ")}</span>
        </div>
      )}
      <div className="lab-score">
        <TrioScore
          staves={shown.map((notes, v) => ({ clef: clefOf(voices[v]), notes, editable: false, label: v === cantusIndex ? "Cantus firmus" : v === added ? "New voice" : undefined, fux: alt && alt.voice === v ? voices[v] : undefined }))}
          active={selected?.voice ?? -1}
          selected={selected?.bar ?? -1}
          cursor={cursor}
          marks={errorBars.map((bar) => ({ bar, severity: "error" as const }))}
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

export function TrioChoiceDetail({ audit, at, setAt, writtenLabel }: { audit: TrioAudit; at: { i: number; bar: number }; setAt: (x: { i: number; bar: number }) => void; writtenLabel: string }) {
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
      <div className="lab-table-wrap">
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
    </div>
  );
}

export function TrioAuditList({ audits, sel, setSel }: { audits: TrioAudit[]; sel: { ex: number; i: number; bar: number }; setSel: (x: { ex: number; i: number; bar: number }) => void }) {
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

let cache: { habits: ReturnType<typeof buildTrioHabits>; accidentals: Record<string, string[]> } | null = null;

/** A third voice for a generated first-species exercise (Fux's three-voice habits, his accidentals on that final). */
export function addThirdVoice(o: { cantus: string[]; line: string[]; cantusVoice: "upper" | "lower"; final: ModalFinal; placement: Placement; weight: number; temperature: number }): ThirdVoice {
  cache ??= { habits: buildTrioHabits(TRIO_STEPS), accidentals: trioAccidentals(TRIO_STEPS) };
  const given: [string[], string[]] = o.cantusVoice === "lower" ? [o.line, o.cantus] : [o.cantus, o.line];
  return generateThirdVoice({ modalFinal: o.final, given, cantusOfGiven: o.cantusVoice === "lower" ? 1 : 0, placement: o.placement, habits: cache.habits, accidentals: cache.accidentals[o.final] ?? [], counselWeight: o.weight, temperature: o.temperature, seed: Math.floor(Math.random() * 2 ** 31) });
}

export const judgeGeneratedTrio = (final: ModalFinal, t: ThirdVoice) => judgeTrio({ modalFinal: final, cantusIndex: t.cantusIndex, rules: TRIO_FIRST_SPECIES }, t.voices);

/** The audit of a generated trio, as of one of Fux's. */
export function auditGeneratedTrio(final: ModalFinal, cantus: string[], t: ThirdVoice): TrioAudit {
  const step: TrioStep = { id: "generated", ordinal: 0, exerciseId: "generated", figure: "–", page: 0, modalFinal: final, cantusIndex: t.cantusIndex, cantus, fux: t.voices, clefs: [], clefs1725: [] };
  return auditTrio(TRIO_STEPS, step, { leaveOneOut: false });
}

export const STAFF_ROLE = (t: ThirdVoice) => t.voices.map((_, v) => `${STAFF_NAMES[v]}: ${v === t.cantusIndex ? "cantus firmus" : v === t.added ? "third voice" : "counterpoint"}`).join(" · ");
