/**
 * P20: the fermatas shown and chosen on the chorale screens (the owner: "even more fermata options
 * and the possibility of making them longer or shorter"). Each fermata shows how it will be sung;
 * tapping it on the score, or its row in the "Fermatas" tab, lets the player choose another way
 * (through, leaned on, a breath, a caesura, held 1.5, 2 or 3 times) and make it longer or shorter.
 * One slider makes all of them longer or shorter. The choices are kept in this browser, per chorale.
 */
import { useState } from "react";
import { FERMATA_CHOICES, setFermataScale, type FermataChoice, type FermataEdit, type FermataPlan } from "../audio/chorale-performance.ts";
import { HFader } from "./HFader.tsx";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

const SCALE_KEY = "wtg.fermataScale";
setFermataScale(stored<number>(SCALE_KEY, 1, (v) => typeof v === "number" && v >= 0.25 && v <= 3));

/** The steps of "longer" and "shorter". */
const STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const step = (x: number, dir: 1 | -1) => {
  const i = STEPS.findIndex((s) => s >= x - 1e-9);
  const k = Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? STEPS.length - 1 : i) + dir));
  return STEPS[k];
};

/** A short sign for a fermata's treatment, drawn under it on the score. */
export function fermataSign(p: FermataPlan | undefined): string {
  if (!p || p.kind === "through") return "→";
  if (p.kind === "breath") return p.gap > 0 ? "//" : "’";
  const x = Math.round(p.hold * 100) / 100;
  return `×${x}`;
}

export function useFermataEdits(key: string): [(FermataEdit | null)[], (k: number, e: FermataEdit | null) => void] {
  const storeKey = `wtg.fermatas.${key}`;
  const read = () => stored<(FermataEdit | null)[]>(storeKey, [], (v) => Array.isArray(v));
  const [state, setState] = useState<{ key: string; edits: (FermataEdit | null)[] }>(() => ({ key, edits: read() }));
  const edits = state.key === key ? state.edits : read();
  if (state.key !== key) setState({ key, edits });
  return [
    edits,
    (k, e) => {
      const next = [...edits];
      while (next.length <= k) next.push(null);
      next[k] = e && ((e.kind && e.kind !== "auto") || (e.scale ?? 1) !== 1) ? e : null;
      while (next.length && !next[next.length - 1]) next.pop();
      setState({ key, edits: next });
      store(storeKey, next);
    },
  ];
}

/** All fermatas longer or shorter. */
export function FermataScale({ onChange }: { onChange?(): void }) {
  const [v, setV] = useState(() => stored<number>(SCALE_KEY, 1, (x) => typeof x === "number" && x >= 0.25 && x <= 3));
  return (
    <HFader
      label={t("fermata.scale")}
      help={t("fermata.scale.help")}
      value={v}
      min={0.25}
      max={3}
      defaultValue={1}
      format={(x) => `×${Math.round(x * 100) / 100}`}
      onChange={(x) => {
        const r = Math.round(x * 20) / 20;
        setV(r);
        setFermataScale(r);
        store(SCALE_KEY, r);
        onChange?.();
      }}
    />
  );
}

export interface FermataRow {
  plan: FermataPlan | undefined;
  bar: number;
  /** The words sung there (the line's last word), if known. */
  word?: string | null;
}

/** The "Fermatas" tab: each fermata, how it is sung and why, with the player's choice. */
export function FermataList({ rows, edits, onEdit, selected, onSelect }: { rows: FermataRow[]; edits: (FermataEdit | null)[]; onEdit(k: number, e: FermataEdit | null): void; selected: number | null; onSelect(k: number): void }) {
  return (
    <div className="chorale-about fermata-list">
      <p className="muted">{t("fermata.help")}</p>
      <ol className="chorale-verdicts">
        {rows.map((r, k) => {
          const e = edits[k] ?? {};
          const scale = e.scale ?? 1;
          return (
            <li key={k} className={selected === k ? "fermata-row selected" : "fermata-row"} onClick={() => onSelect(k)}>
              <strong>{t("fermata.row", { bar: r.bar })}</strong>
              {r.word ? <em> «{r.word}»</em> : null} <span className="fermata-sign">{fermataSign(r.plan)}</span> <span className="muted">{r.plan?.why ?? ""}</span>
              <span className="fermata-controls">
                <select className="sel" value={e.kind ?? "auto"} onChange={(ev) => onEdit(k, { ...e, kind: ev.target.value as FermataChoice })} aria-label={t("fermata.choice")}>
                  {FERMATA_CHOICES.map((c) => (
                    <option key={c} value={c}>{t(`fermata.kind.${c}`)}</option>
                  ))}
                </select>
                <button className="icon" onClick={(ev) => { ev.stopPropagation(); onEdit(k, { ...e, scale: step(scale, -1) }); }} aria-label={t("fermata.shorter")} title={t("fermata.shorter")}>−</button>
                <span className="fermata-scale">×{scale}</span>
                <button className="icon" onClick={(ev) => { ev.stopPropagation(); onEdit(k, { ...e, scale: step(scale, 1) }); }} aria-label={t("fermata.longer")} title={t("fermata.longer")}>+</button>
                {edits[k] && (
                  <button className="link" onClick={(ev) => { ev.stopPropagation(); onEdit(k, null); }}>{t("fermata.reset")}</button>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
