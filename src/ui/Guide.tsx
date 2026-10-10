/**
 * How to play (D96): HOW TO PLAY and the rules in one place, a dock tab (detachable on a wide
 * screen) in sections — playing (controls, keys, the parts of the screen), the basics (the
 * concepts, each explained), the rules of this exercise, and the Gradus itself (D97).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Term } from "./Term.tsx";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

const KEYS: [string, string][] = [
  ["← →", "help.keys.move"],
  ["↑ ↓", "help.keys.step"],
  ["A–G", "help.keys.letter"],
  ["#  -  n", "help.keys.accidental"],
  ["Delete", "help.keys.clear"],
  ["R", "help.keys.rest"],
  ["T", "help.keys.tie"],
  ["8 4 3 2 6 1", "help.keys.value"],
  ["H", "help.keys.hint"],
  ["Space", "help.keys.hear"],
  ["P", "help.keys.play"],
  ["F1–F9", "help.keys.tracks"],
  ["Tab", "help.keys.voice"],
];
const BASICS = ["cantusFirmus", "counterpoint", "species", "mode", "final", "interval", "consonance", "perfect", "imperfect", "dissonance", "motion", "cadence", "leadingTone", "downbeat", "passing", "cambiata", "ligature", "suspension", "miContraFa", "ficta", "triad", "sixThree", "figures", "continuo", "versions", "aloysius", "josephus", "gradus"] as const;

type Section = "playing" | "basics" | "exercise" | "gradus";

export function Guide({ basics, exercise, section, onSection }: { basics?: ReactNode; exercise: ReactNode; section?: Section; onSection?: (s: Section) => void }) {
  const [own, setOwn] = useState<Section>(() => {
    const v = stored<string>("wtg.guide", "playing", (x) => typeof x === "string");
    return v === "rules" ? "exercise" : v === "playing" || v === "basics" || v === "exercise" || v === "gradus" ? v : "playing";
  });
  const current = section ?? own;
  const pick = (s: Section) => (onSection ? onSection(s) : setOwn(s));
  useEffect(() => store("wtg.guide", current), [current]);
  return (
    <div className="guide">
      <nav className="guide-tabs" role="tablist">
        {(["playing", "basics", "exercise", "gradus"] as const).map((s) => (
          <button key={s} role="tab" aria-selected={current === s} aria-pressed={current === s} onClick={() => pick(s)} title={t(`guide.${s}.help`)}>
            {t(`guide.${s}`)}
          </button>
        ))}
      </nav>
      {current === "playing" && (
        <div className="guide-body">
          <p>{t("help.howto")}</p>
          <h3>{t("guide.keys")}</h3>
          <table className="keys">
            <tbody>
              {KEYS.map(([k, d]) => (
                <tr key={k}>
                  <th><kbd>{k}</kbd></th>
                  <td>{t(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">{t("help.mouse")}</p>
        </div>
      )}
      {current === "basics" && (
        <div className="guide-body">
          {basics}
          <h3>{t("guide.basics.terms")}</h3>
          <dl className="glossary">
            {BASICS.map((k) => {
              const [head, ...rest] = t(`gloss.${k}`).split(":");
              return (
                <div key={k}>
                  <dt><Term gloss={k}>{head}</Term></dt>
                  <dd>{rest.join(":").trim()}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
      {current === "exercise" && <div className="guide-body">{exercise}</div>}
      {current === "gradus" && (
        <div className="guide-body gradus">
          <blockquote className="tutor gradus-quote">
            “{t("guide.gradus.quote")}”
            <cite>{t("guide.gradus.quoteCite")}</cite>
          </blockquote>
          <p>{t("guide.gradus.p1")}</p>
          <p>{t("guide.gradus.p2")}</p>
          <p>{t("guide.gradus.p3")}</p>
          <p className="note">{t("guide.gradus.ref")}</p>
          <p>{t("guide.gradus.p4")}</p>
        </div>
      )}
    </div>
  );
}
