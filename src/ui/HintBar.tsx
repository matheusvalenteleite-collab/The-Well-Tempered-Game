/**
 * The hint for the note being written (D115), from the Choices lab's engine: how many pitches the
 * rules allow here given the rest of the line, whether the written one is among them (and if not,
 * what it breaks), its rank among them by Fux's counsel and habits, and on request the most
 * Fux-like note (learnt from his other solutions, never this one). Computed a moment after each
 * change, so that writing stays quick.
 */
import { useEffect, useState } from "react";
import type { ChoiceContext } from "../counterpoint/choices/alternatives.ts";
import { hintAt, unitAt, type Hint } from "../counterpoint/choices/hints.ts";
import { noteName, type NameStyle } from "../music/names.ts";
import { t } from "./i18n.ts";

/** A rule's message for the player (the game's hint text), else the tutor's. */
function message(messageKey: string): string {
  for (const k of [`hints.${messageKey}`, `tutor.${messageKey}`]) {
    try {
      return t(k);
    } catch {
      /* next */
    }
  }
  return messageKey;
}

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export function HintBar(p: { ctx: ChoiceContext; line: (string | null)[]; selected: number; nameStyle: NameStyle; onWrite(unit: number[], pitch: string): void; onClose(): void }) {
  const [hint, setHint] = useState<Hint | null | "wait">("wait");
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setReveal(false);
    setHint("wait");
    const id = window.setTimeout(() => {
      try {
        setHint(hintAt(p.ctx, p.line, unitAt(p.ctx, p.line, p.selected)));
      } catch {
        setHint(null);
      }
    }, 90);
    return () => window.clearTimeout(id);
  }, [p.ctx, p.line, p.selected]);

  /** "B♭3", with its solfège name when the score shows those ("B♭3, si♭"). */
  const name = (q: string) => `${noteName(q, "letters")}${q.match(/-?\d+$/)?.[0] ?? ""}${p.nameStyle === "solfege" ? `, ${noteName(q, "solfege")}` : ""}`;
  let body: React.ReactNode;
  if (hint === "wait") body = <span className="hint-wait">{t("ui.hint.thinking")}</span>;
  else if (!hint) body = <span>{t("ui.hint.notYet")}</span>;
  else {
    const where = t(hint.beat === 0 ? "ui.hint.bar" : "ui.hint.barBeat", { bar: hint.bar + 1, beat: hint.beat + 1 });
    const mine = hint.written ? hint.candidates.find((c) => c.pitch === hint.written) : null;
    const count = hint.legal === 0 ? t("ui.hint.none") : hint.legal === 1 ? t("ui.hint.one") : t("ui.hint.many", { n: hint.legal });
    body = (
      <>
        <strong>{where}.</strong> {count}{" "}
        {mine && mine.legal && <span className="hint-ok">{t("ui.hint.yoursOk", { note: name(hint.written!), rank: ordinal(hint.rank), n: hint.legal })}</span>}
        {mine && !mine.legal && (
          <span className="hint-bad">
            {t("ui.hint.yoursBad", { note: name(hint.written!) })} {[...new Set(mine.caused.map((v) => message(v.messageKey)))].join(" ")}
          </span>
        )}{" "}
        {hint.best && !reveal && hint.best !== hint.written && (
          <button className="chipbtn" onClick={() => setReveal(true)} title={t("ui.hint.suggestHelp")}>{t("ui.hint.suggest")}</button>
        )}
        {hint.best && reveal && (
          <>
            {t("ui.hint.best", { note: name(hint.best) })}{" "}
            <button className="chipbtn" onClick={() => p.onWrite(hint.unit, hint.best!)}>{t("ui.hint.write")}</button>
          </>
        )}
      </>
    );
  }
  return (
    <div className="hint-bar" role="status" aria-live="polite">
      <span className="hint-tag">{t("ui.hint.tag")}</span>
      <span className="hint-body">{body}</span>
      <button className="hint-close" onClick={p.onClose} aria-label={t("ui.close")} title={t("ui.close")}>×</button>
    </div>
  );
}
