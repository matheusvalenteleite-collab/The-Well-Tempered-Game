/**
 * "Fux #n" (D96): a reference to one of Fux's printed examples. Pointing at it (or tapping it)
 * opens a small card with the example engraved — the cantus and Fux's counterpoint — from the
 * dataset. `Rich` turns the references and the glossary words of a text into these and Terms.
 */
import { useState, type ReactNode } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { notesToSlots, slotLayout, type SpeciesId } from "../counterpoint/layout.ts";
import { ScoreView } from "./notation/ScoreView.tsx";
import { displayClefs } from "../game/exercise-view.ts";
import { Term } from "./Term.tsx";
import { t } from "./i18n.ts";

function figureScore(n: string): ReactNode {
  const ex = repository.listExercises().find((e) => String(e.figure) === n || String(e.figure).replace(/^0+/, "") === n);
  if (!ex) return null;
  const sol = repository.getSolution(ex.id);
  const cf = repository.getCantusFirmus(ex.cantus_firmus.cf_id);
  if (!sol || !cf) return null;
  const layout = slotLayout(ex.species as SpeciesId, cf.pitch_sequence.length);
  let fux: string[];
  try {
    fux = notesToSlots(layout, sol.counterpoint.notes);
  } catch {
    return null;
  }
  return (
    <ScoreView
      cantus={cf.pitch_sequence}
      counterpoint={fux}
      layout={layout}
      cantusVoice={ex.cantus_voice}
      clefs={displayClefs(cf.pitch_sequence, ex.cantus_voice)}
      selected={-1}
      cursor={-1}
      label={t("ui.figure.label", { n })}
      fixedScale={0.55}
      readOnly
      onPlace={() => undefined}
      onSelect={() => undefined}
    />
  );
}

export function FuxRef({ n, children }: { n: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const show = (e: React.MouseEvent | React.FocusEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(window.innerWidth - 470, r.left)), y: r.top });
    setOpen(true);
  };
  const score = open ? figureScore(n) : null;
  return (
    <span className="fux-ref" tabIndex={0} data-info={t("ui.figure.help", { n })} onMouseEnter={show} onMouseLeave={() => setOpen(false)} onFocus={show} onBlur={() => setOpen(false)} onClick={(e) => (open ? setOpen(false) : show(e))}>
      {children ?? `Fux #${n}`}
      {open && (
        <span className="fux-card" style={{ left: pos.x, top: Math.max(8, pos.y - 190) }} role="tooltip">
          <span className="fux-card-title">{t("ui.figure.title", { n })}</span>
          {score ?? <span className="help">{t("ui.figure.none")}</span>}
        </span>
      )}
    </span>
  );
}

/** Glossary words found in texts, and the entry each opens (first occurrence per text only). */
const WORDS: [RegExp, string][] = [
  [/\bcantus firmus\b/i, "cantusFirmus"],
  [/\bfinal\b/i, "final"],
  [/\bmodes?\b/i, "mode"],
  [/\btritone\b/i, "miContraFa"],
  [/\bmi contra fa\b/i, "miContraFa"],
  [/\bcadence\b/i, "cadence"],
  [/\bleading tone\b/i, "leadingTone"],
  [/\bligatures?\b/i, "ligature"],
  [/\bsuspensions?\b/i, "suspension"],
  [/\bcambiata\b/i, "cambiata"],
  [/\bpassing notes?\b/i, "passing"],
  [/\b(?:thesis|arsis)\b/i, "downbeat"],
  [/\bficta\b/i, "ficta"],
  [/\btriad\b/i, "triad"],
  [/\bimperfect consonances?\b/i, "imperfect"],
  [/\bperfect consonances?\b/i, "perfect"],
  [/\bdissonances?\b/i, "dissonance"],
];
const FIG = /Figs?\.\s*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?/;

/** A text with its figure references and glossary words made live. */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const used = new Set<string>();
  let rest = text;
  let key = 0;
  while (rest.length) {
    // The earliest of: a figure reference, an unused glossary word.
    let best: { at: number; len: number; node: ReactNode } | null = null;
    const f = FIG.exec(rest);
    if (f) best = { at: f.index, len: f[0].length, node: f[2] ? <span key={key++}><FuxRef n={f[1]}>{`Fux #${f[1]}`}</FuxRef>–<FuxRef n={f[2]}>{f[2]}</FuxRef></span> : <FuxRef key={key++} n={f[1]} /> };
    for (const [re, gloss] of WORDS) {
      if (used.has(gloss)) continue;
      const m = re.exec(rest);
      if (m && (!best || m.index < best.at)) best = { at: m.index, len: m[0].length, node: <Term key={key++} gloss={gloss}>{m[0]}</Term> };
    }
    if (!best) {
      out.push(rest);
      break;
    }
    out.push(rest.slice(0, best.at), best.node);
    const word = WORDS.find(([re]) => re.test(rest.slice(best!.at, best!.at + best!.len)));
    if (word) used.add(word[1]);
    rest = rest.slice(best.at + best.len);
  }
  return <>{out}</>;
}
