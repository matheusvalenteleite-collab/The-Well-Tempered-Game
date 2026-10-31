/**
 * D342, THE MANUAL's lens sheet: after a lesson's take, COUNTS with the figures reached (✓ or ✗), SHOWN
 * with its figures, NEVER. D369: 0.2 withdrawn. D373: 0.1 (the grip) withdrawn too (the sound's delay
 * check lives in SETTINGS; 1.1 tours the real play screen instead), and the tutorial's pieces of the play
 * screen: the step's banner (WATCH · BACH PLAYS, TRY · I WAIT FOR YOU, YOUR TURN · PLAY) and the strips'
 * words, his words over the foot of the box while the step runs, 1.1's bubbles, a sign's card (Part 3),
 * and the compact result (one number, the details behind "?").
 */
import { useEffect, useState, type ReactNode } from "react";
import { tr } from "../../i18n/index.ts";
import { Portrait } from "../Bach.tsx";
import type { LensStats } from "./lens.ts";
import { PARTS, SIGN_WORDS, STEP_WORD, TOUR, TOUR_TOUCH, type Check, type ManualLesson, type PartId, type SignId, type Stage, type StageKind } from "./lessons.ts";

const fill = (c: Check) => tr(c.text, c.vars);

/** After a take: what counted (with ✓ or ✗), what was shown, what is never judged. */
export function LensSheet({ l, x, kind, st }: { l: ManualLesson; x: LensStats; kind: "drill" | "play"; st?: Stage }) {
  // D359: a drill's lines with nothing to measure are left out (they read as "0 OF 0").
  const counts = (l.checks?.(x, st) ?? []).filter((c) => !c.na);
  const shown = l.shown?.(x, st) ?? [];
  void kind;
  return (
    <div className="tb-lens" id="lens-sheet" onClick={(e) => e.stopPropagation()}>
      {counts.length > 0 && (
        <ul className="tb-lens-counts">
          {counts.map((c) => (
            <li key={c.text} className={c.ok ? "ok" : "no"}>
              <span aria-hidden="true">{c.ok ? "✓" : "✗"}</span> {fill(c)}
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

/**
 * D373 (the report: "after a PLAY: one line from Bach, one number at most … the details sit behind a
 * small ?"): the take's main figure, and "?" opening the lens sheet.
 */
export function ResultLine({ l, x, st, extra }: { l: ManualLesson; x: LensStats; st?: Stage; extra?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const main = (l.checks?.(x, st) ?? []).find((c) => !c.na);
  return (
    <div className="tb-result-line" id="result-line" onClick={(e) => e.stopPropagation()}>
      {extra}
      <p className="tb-result-num">
        {main && (
          <span className={main.ok ? "ok" : "no"}>
            {main.ok ? "✓" : "✗"} {fill(main)}
          </span>
        )}
        <button type="button" id="result-more" className="tb-result-more" aria-expanded={open} aria-label={tr("WHAT COUNTED")} onClick={() => setOpen((o) => !o)}>
          ?
        </button>
      </p>
      {open && <LensSheet l={l} x={x} kind="play" st={st} />}
    </div>
  );
}

/** D359: under a stage's line, the material named small, with its badge (what is played, at what tempo). */
export function StageLine({ l, k }: { l: ManualLesson; k: number }) {
  const st = l.stages[k];
  if (!st) return null;
  return (
    <p className="tb-manual-stage" id="stage-line" onClick={(e) => e.stopPropagation()}>
      <span className={`tb-manual-badge ${st.kind}`}>{tr(STEP_WORD[st.kind])}</span> {tr(st.m.label)}
    </p>
  );
}

/**
 * D373, the convention that keeps WATCH, TRY and PLAY apart (the report's §7): a banner at the top of
 * the box (blue WATCH · BACH PLAYS; grey-gold TRY · I WAIT FOR YOU; gold YOUR TURN · PLAY), the left
 * strip's word (WATCH ONLY · DON'T TOUCH YET; YOUR TURN), and, touched while he plays, JUST WATCH FOR NOW.
 */
export function StepBanner({ kind, nudge }: { kind: StageKind; nudge: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => tick((n) => n + 1), 1300);
    return () => window.clearTimeout(t);
  }, [nudge]);
  // D379: LISTEN (he plays; nothing to touch) and SPOT (he plays; tap as the tune comes in).
  const word = kind === "watch" ? "WATCH · BACH PLAYS" : kind === "listen" ? "LISTEN · BACH PLAYS" : kind === "spot" ? "SPOT · TAP WHEN THE TUNE COMES IN" : kind === "try" ? "TRY · I WAIT FOR YOU" : kind === "tour" ? "" : "YOUR TURN · PLAY";
  const strip = kind === "watch" ? "WATCH ONLY · DON'T TOUCH YET" : kind === "listen" ? "JUST LISTEN" : kind === "spot" ? "TAP WHEN IT COMES IN" : kind === "play" ? "YOUR TURN" : kind === "try" ? "TRY" : "";
  const nudged = nudge > 0 && performance.now() - nudge < 1200;
  return (
    <>
      {word && (
        <p className={`tb-step-banner ${kind}`} id="step-banner" role="status">
          {tr(word)}
        </p>
      )}
      {strip && <p className={`tb-step-strip ${kind}`}>{tr(strip)}</p>}
      {nudged && (
        <p className="tb-step-nudge" role="status">
          {tr(kind === "listen" ? "JUST LISTEN FOR NOW" : "JUST WATCH FOR NOW")}
        </p>
      )}
    </>
  );
}

/** D379, SPOT: a tap's flash over the box: a new entry found (✓ THERE IT IS), or not (NOT A NEW ENTRY). */
export function SpotFlash({ ok }: { ok: boolean }) {
  return (
    <p className={`tb-spot-flash ${ok ? "ok" : "no"}`} role="status" id="spot-flash">
      {tr(ok ? "✓ THERE IT IS" : "NOT A NEW ENTRY")}
    </p>
  );
}

/** D379, SPOT: after the step, one number: the entries found, and the stray taps. */
export function SpotLine({ r }: { r: { spotted: number; of: number; strays: number } }) {
  return (
    <p className="tb-result-num" id="spot-line" onClick={(e) => e.stopPropagation()}>
      <span className={r.spotted ? "ok" : "no"}>{tr("ENTRIES FOUND {n} OF {m} · STRAY TAPS {s}", { n: r.spotted, m: r.of, s: r.strays })}</span>
    </p>
  );
}

/** D373: his words over the foot of the box while a step runs (the layout never moves; touches pass through). */
export function Caption({ text }: { text: string }) {
  return (
    <div className="tb-caption" id="caption" aria-live="polite">
      <Portrait talking={false} />
      <p>{tr(text)}</p>
    </div>
  );
}

/**
 * D373, 1.1: his six bubbles over the real play screen, one tap each; at the second he waits for a touch
 * on each strip (each plays a note: the first sound the player makes).
 */
export function TourBubble({ k, touched, next }: { k: number; touched: { left: boolean; right: boolean }; next: () => void }) {
  const line = TOUR[k];
  const waiting = line?.focus === "strips" && !(touched.left && touched.right);
  if (!line) return null;
  return (
    <div className="tb-bach tb-bach-low tb-tour" id="tour-bubble" role="dialog" aria-label={`Herr Bach: ${k + 1} / ${TOUR.length}`} onClick={() => !waiting && next()}>
      <Portrait talking={false} />
      <div className="tb-bach-box">
        <p className="tb-bach-title">
          1.1 · {tr("THE PLAY SCREEN")} · {k + 1} / {TOUR.length}
        </p>
        <p className="tb-bach-line">{tr(line.text)}</p>
        <p className="tb-bach-more">{waiting ? tr(touched.left ? TOUR_TOUCH[1] : TOUR_TOUCH[0]) : tr("TAP ▶")}</p>
      </div>
    </div>
  );
}

/** D373: a sign alone, on a card, in the shapes the box draws (Mario's tut-notation), before the lesson that uses it. */
export function SignCard({ sign }: { sign: SignId }) {
  const w = SIGN_WORDS[sign];
  return (
    <div className={`tb-sign-card ${sign}`} id="sign-card" onClick={(e) => e.stopPropagation()}>
      <p className="tb-sign-name">{tr(w.name)}</p>
      <div className="tb-sign-pic" aria-hidden="true">
        {sign === "held" && <i className="blk long" />}
        {sign === "short" && (
          <i className="blk long hollow">
            <b />
          </i>
        )}
        {sign === "detached" && (
          <>
            <i className="blk" />
            <i className="blk" />
            <em>{tr("GAP")}</em>
          </>
        )}
        {sign === "joined" && (
          <>
            <i className="blk join" />
            <i className="blk join2" />
            <em>{tr("NO GAP")}</em>
          </>
        )}
        {sign === "accent" && (
          <>
            <i className="blk" />
            <i className="blk accent" />
          </>
        )}
      </div>
      <p className="tb-sign-text">{tr(w.text)}</p>
    </div>
  );
}

/**
 * D359, a part's seal: a checkpoint passed seals its part, a wax seal pressed with the part's numeral and
 * its title round it (the manual's arc made visible). D373: the new parts' numerals (1, 2, 3; the older
 * III–V as 4–6).
 */
export function Seal({ part, small = false }: { part: PartId; small?: boolean }) {
  const p = PARTS.find((q) => q.id === part);
  const n = String(p?.n ?? part);
  return (
    <div className={`tb-seal${small ? " small" : ""}`} id={small ? undefined : "part-seal"} onClick={(e) => e.stopPropagation()}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="tb-seal-wax">
        <defs>
          <path id={`seal-arc-${part}`} d="M 50 50 m -34 0 a 34 34 0 1 1 68 0 a 34 34 0 1 1 -68 0" />
        </defs>
        <path d="M50 4 C60 6 64 2 72 8 C80 13 86 12 90 22 C95 31 98 36 96 46 C95 56 99 62 93 71 C88 80 86 86 76 90 C67 95 62 98 52 96 C42 95 36 99 27 93 C18 88 12 86 8 76 C3 67 1 62 4 52 C5 42 1 36 7 27 C12 18 14 12 24 8 C33 3 40 2 50 4 Z" fill="#9b2a22" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#c9483c" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#6e1a14" strokeWidth="1" />
        {!small && (
          <text fontSize="7.5" fill="#f2c8a8" letterSpacing="1">
            <textPath href={`#seal-arc-${part}`}>{p ? tr(p.english) : ""} ·</textPath>
          </text>
        )}
        <text x="50" y="59" textAnchor="middle" fontSize={26} fill="#f6dcc2" fontFamily="serif" fontWeight="bold">
          {n}
        </text>
      </svg>
      {!small && <p className="tb-seal-word">{tr("PART {p} · SEALED", { p: n })}</p>}
    </div>
  );
}
